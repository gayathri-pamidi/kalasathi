import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import jwt from 'jsonwebtoken';
import { inMemoryProducts, createProduct, getProducts, updateProduct, deleteProduct } from './controllers/artisanController.js';
import { protect } from './middleware/authMiddleware.js';

const secret = process.env.JWT_SECRET || 'YOUR_JWT_SECRET';

const response = () => {
  const result = { statusCode: 200, body: null };
  return {
    result,
    status(code) {
      result.statusCode = code;
      return this;
    },
    json(body) {
      result.body = body;
      return this;
    }
  };
};

const requestFor = (userId, body = {}, params = {}) => ({
  user: { user_id: userId, role: 'artisan' },
  body,
  params
});

afterEach(() => {
  inMemoryProducts.splice(0, inMemoryProducts.length);
});

test('JWT middleware exposes the authenticated user_id to product controllers', () => {
  const token = jwt.sign({ user_id: 'artisan_A', role: 'artisan' }, secret);
  const req = { headers: { authorization: `Bearer ${token}` } };
  let nextCalled = false;

  protect(req, { status: () => ({ json: () => {} }) }, () => { nextCalled = true; });

  assert.equal(nextCalled, true);
  assert.equal(req.user.user_id, 'artisan_A');
});

test('product catalog is isolated by authenticated user_id for all CRUD operations', async () => {
  const product = (userId, title) => requestFor(userId, {
    title,
    description: `${title} description`,
    category: 'craft',
    price: 100,
    stock: 2,
    user_id: 'attacker-supplied-id'
  });

  let res = response();
  await createProduct(product('artisan_A', 'product_A1'), res);
  assert.equal(res.result.statusCode, 201);
  const productA1 = res.result.body.product.product_id;

  res = response();
  await createProduct(product('artisan_A', 'product_A2'), res);
  assert.equal(res.result.statusCode, 201);

  res = response();
  await createProduct(product('artisan_B', 'product_B1'), res);
  assert.equal(res.result.statusCode, 201);
  const productB1 = res.result.body.product.product_id;

  res = response();
  await getProducts(requestFor('artisan_A'), res);
  assert.deepEqual(res.result.body.products.map(item => item.title), ['product_A2', 'product_A1']);

  res = response();
  await getProducts(requestFor('artisan_B'), res);
  assert.deepEqual(res.result.body.products.map(item => item.title), ['product_B1']);

  res = response();
  await updateProduct(requestFor('artisan_A', { title: 'tampered' }, { product_id: productB1 }), res);
  assert.equal(res.result.statusCode, 403);

  res = response();
  await updateProduct(requestFor('artisan_B', { title: 'tampered' }, { product_id: productA1 }), res);
  assert.equal(res.result.statusCode, 403);

  res = response();
  await deleteProduct(requestFor('artisan_A', {}, { id: productB1 }), res);
  assert.equal(res.result.statusCode, 403);

  res = response();
  await deleteProduct(requestFor('artisan_B', {}, { id: productA1 }), res);
  assert.equal(res.result.statusCode, 403);

  assert.equal(inMemoryProducts.some(item => item.product_id === productB1 && item.user_id === 'artisan_B'), true);
  assert.equal(inMemoryProducts.some(item => item.product_id === productA1 && item.user_id === 'artisan_A'), true);
});