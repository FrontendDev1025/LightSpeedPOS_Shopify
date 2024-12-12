const axios = require('axios');
require('dotenv').config();

// Shopify Configuration
const shopifyStore = process.env.SHOPIFY_STORE;
const shopifyApiKey = process.env.SHOPIFY_API_KEY;
const shopifyPassword = process.env.SHOPIFY_PASSWORD;
const shopifyAccessToken = process.env.SHOPIFY_ACCESS_TOKEN;

// Lightspeed Configuration
const lightspeedAccountId = process.env.LIGHTSPEED_ACCOUNT_ID;
const lightspeedClientID = process.env.LIGHTSPEED_CLIENT_ID;
const lightspeedClientSecret = process.env.LIGHTSPEED_CLIENT_SECRET;

let access_token = process.env.LIGHTSPEED_ACCESS_TOKEN,
    refresh_token = process.env.LIGHTSPEED_REFRESH_TOKEN;

// Function to get products from Shopify
async function getShopifyProducts(product) {
    const url = `https://${shopifyApiKey}:${shopifyPassword}@${shopifyStore}/admin/api/2024-10/products.json`;
    try {
        const response = await axios.get(url, {
            headers: {
                'X-Shopify-Access-Token': shopifyAccessToken,
                'Content-Type': 'application/json'
            }, params: {
                title: product?.description || "",
                vendor: product?.ItemVendorNums?.ItemVendorNum?.value || ""
            }
        });
        return response.data.products;
    } catch (error) {
        console.error('Error fetching products from Shopify:', error);
        throw error;
    }
}

async function setShopifyProducts(product) {
    if (product == undefined || product == null)
        return;
    const url = `https://${shopifyApiKey}:${shopifyPassword}@${shopifyStore}/admin/api/2024-10/products.json`;
    let images = [];
    if (product?.Images) {
        if (Array.isArray(product.Images.Image)) {
            product.Images.Image.forEach(image => {
                images.push({
                    alt: image.description || "undefined",
                    src: image.baseImageURL + image.publicID + '.' + image.filename.split('.')[image.filename.split('.').length - 1]
                })
            })
        } else {
            images.push({
                alt: product.Images.Image.description || "undefined",
                src: product.Images.Image.baseImageURL + product.Images.Image.publicID + '.' + product.Images.Image.filename.split('.')[product.Images.Image.filename.split('.').length - 1],
            })
        }
    }
    const newProduct = {
        title: product?.description || "",
        body_html: `<p>${product?.description || ""}</p>`,
        product_type: "",
        Category: "Furniture",
        tags: product?.Category?.fullPathName.replace(/\//g, ",") || "",
        variants: [
            {
                price: product?.Prices?.ItemPrice[2]?.amount || 0,
                sku: product?.customSku || product?.systemSku || "",
                inventory_quantity: product?.ItemShops ? (Array.isArray(product?.ItemShops?.ItemShop) ? product.ItemShops.ItemShop[0].qoh : product.ItemShops.ItemShop.qoh) : 0,
                old_inventory_quantity: product?.ItemShops ? (Array.isArray(product?.ItemShops?.ItemShop) ? product.ItemShops.ItemShop[0].qoh : product.ItemShops.ItemShop.qoh) : 0
            }
        ],
        options: [],
        images: images,
        vendor: product?.ItemVendorNums?.ItemVendorNum?.value || ""
    }
    try {
        const response = await axios.post(url, { product: newProduct }, {
            headers: {
                'X-Shopify-Access-Token': shopifyAccessToken,
                'Content-Type': 'application/json'
            }
        });
        return response;
    } catch (error) {
        console.error('Error creating product in Shopify:', error);
        throw error;
    }
}

async function updateShopifyProducts(product) {
    if (!product) return;

    try {
        const shopifyProduct = await getShopifyProducts(product);
        if (!shopifyProduct || shopifyProduct.length === 0) {
            return await setShopifyProducts(product);
        }

        const updateURL = `https://${shopifyApiKey}:${shopifyPassword}@${shopifyStore}/admin/api/2024-10/products/${shopifyProduct[0].id}.json`;

        let images = [];
        if (product?.Images) {
            if (Array.isArray(product.Images.Image)) {
                images = product.Images.Image.map(image => ({
                    alt: image.description || "undefined",
                    src: image.baseImageURL + image.publicID + '.' + image.filename.split('.').pop()
                }));
            } else {
                images.push({
                    alt: product.Images.Image.description || "undefined",
                    src: product.Images.Image.baseImageURL + product.Images.Image.publicID + '.' + product.Images.Image.filename.split('.').pop(),
                });
            }
        }

        const newProduct = {
            title: product?.description || "",
            body_html: `<p>${product?.description || ""}</p>`,
            product_type: "Furniture",
            tags: product?.Category?.fullPathName.replace(/\//g, ",") || "",
            variants: [
                {
                    price: product?.Prices?.ItemPrice[2]?.amount.toString() || "0.00",
                    sku: product?.customSku || product?.systemSku || "",
                    inventory_quantity: product?.ItemShops ? (Array.isArray(product?.ItemShops?.ItemShop) ? product.ItemShops.ItemShop[0].qoh : product.ItemShops.ItemShop.qoh) : 0,
                    old_inventory_quantity: product?.ItemShops ? (Array.isArray(product?.ItemShops?.ItemShop) ? product.ItemShops.ItemShop[0].qoh : product.ItemShops.ItemShop.qoh) : 0
                }
            ],
            images: images,
            vendor: product?.ItemVendorNums?.ItemVendorNum?.value || ""
        };

        const response = await axios.put(updateURL, { product: newProduct }, {
            headers: {
                'X-Shopify-Access-Token': shopifyAccessToken,
                'Content-Type': 'application/json'
            }
        });

        return response;
    } catch (error) {
        console.error('Error updating product in Shopify:', error);
        throw error;
    }
}

async function getAuthorizationCode() {
    const url = `https://cloud.lightspeedapp.com/oauth/authorize.php?response_type=code&client_id=${lightspeedClientID}&scope=employee:all&redirect_uri=https://stylesensefurniture.ca/token`;
    console.log(url);
}

async function getAccessToken(code) {
    const url = `https://cloud.lightspeedapp.com/oauth/access_token.php`;
    const data = {
        grant_type: "authorization_code",
        client_id: lightspeedClientID,
        client_secret: lightspeedClientSecret,
        code: code,
        redirect_uri: "https://stylesensefurniture.ca/token"
    };
    try {
        const response = await axios.post(url, data, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        if (response.status === 200) {
            access_token = response.data.access_token;
            refresh_token = response.data.refresh_token;  // Update refresh token if provided
            console.log('New Access Token:', access_token);
            console.log('New Refresh Token:', refresh_token);
            return response.data;
        }
        throw new Error("Failed to get access token");
    } catch (error) {
        console.error('Error getting access token:', error);
        throw error;
    }
}

async function refreshAccessToken() {
    const url = `https://cloud.lightspeedapp.com/oauth/access_token.php`;
    const data = {
        grant_type: "refresh_token",
        client_id: lightspeedClientID,
        client_secret: lightspeedClientSecret,
        refresh_token: refresh_token,
        redirect_uri: "https://stylesensefurniture.ca/token"
    };
    try {
        const response = await axios.post(url, data, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        if (response.status === 200) {
            access_token = response.data.access_token;
            console.log('New Access Token:', access_token);
            return response.data;
        } else {
            throw new Error(`Failed to refresh access token: ${response.status}`);
        }
    } catch (error) {
        console.error('Error refreshing access token:', error);
        throw error;
    }
}

async function createLightspeedProduct(product) {
    const url = `https://api.lightspeedapp.com/API/Account/${lightspeedAccountId}/Item.json`;
    const productData = {
        description: product.title,
        Prices: {
            ItemPrice: [{
                amount: product.variants[0].price,
                useType: "Default"
            }]
        },
        customSku: product.variants[0].sku
    };

    try {
        const response = await axios.post(url, productData, {
            headers: {
                'Authorization': `Bearer ${access_token}`,
                'Content-Type': 'application/json'
            }
        });
        console.log(`Product ${product.title} created in Lightspeed.`);
        return response.data;
    } catch (error) {
        console.error(`Error creating product ${product.title} in Lightspeed:`, error);
        throw error;
    }
}

async function getLightspeedProduct() {
    try {
        const filters = {
            manufacturerSku: 'RNS057',
        };
        const url = `https://api.lightspeedapp.com/API/Account/${lightspeedAccountId}/Item.json`;
        const response = await axios.get(url, {
            headers: {
                'Authorization': `Bearer ${access_token}`,
                'Content-Type': 'application/json'
            },
            params: { ...filters, load_relations: 'all' }
        });
        return response.data;
    } catch (error) {
        console.error("Failed to fetch products from Lightspeed:", error);
        throw error;
    }
}

async function syncProductsFromLSToShopify() {
    try {
        await refreshAccessToken();
        const product = await getLightspeedProduct();
        if (!product) return;

        if (parseInt(product['@attributes'].count) > 1) {
            await Promise.all(product.Item.map(element => updateShopifyProducts(element.Item)));
        } else {
            await updateShopifyProducts(product.Item);
        }
        console.log('Products synced successfully from Lightspeed to Shopify');
    } catch (error) {
        console.error('Error syncing products from Lightspeed to Shopify:', error);
    }
}

async function syncProductsFromShopifyToLS() {
    try {
        await refreshAccessToken();
        const product = await getLightspeedProduct();
        if (!product) return;

        if (parseInt(product['@attributes'].count) > 1) {
            await Promise.all(product.Item.map(element => createLightspeedProduct(element.Item)));
        } else {
            await createLightspeedProduct(product.Item);
        }
        console.log('Products synced successfully from Shopify to Lightspeed');
    } catch (error) {
        console.error('Error syncing products from Shopify to Lightspeed:', error);
    }
}

// Start the synchronization process
setInterval(syncProductsFromLSToShopify, 1000 * 200);
// syncProductsFromLSToShopify();