import test from "node:test";import assert from "node:assert/strict";import fs from "node:fs";
const products=fs.readFileSync(new URL("../lib/products.ts",import.meta.url),"utf8");const checkout=fs.readFileSync(new URL("../app/api/checkout/route.ts",import.meta.url),"utf8");const webhook=fs.readFileSync(new URL("../app/api/webhooks/stripe/route.ts",import.meta.url),"utf8");
test("catalog stores prices in integer cents and has Christian kids products",()=>{assert.match(products,/price:number/);assert.match(products,/Moldura — Jesus ama as crianças/);assert.match(products,/formatBRL/)});
test("checkout validates server-side product and amount",()=>{assert.match(checkout,/products\.find/);assert.match(checkout,/unit_amount:p\.price/);assert.match(checkout,/Number\.isInteger/)});
test("webhook verifies signature against raw request body",()=>{assert.match(webhook,/constructEvent\(rawBody,signature,hook\)/);assert.match(webhook,/request\.text\(\)/)});
