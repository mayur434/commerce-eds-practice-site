// scripts/customer-actions.js

// 💡 Replace these with your actual App Builder web action URLs
const CREATE_CUSTOMER_ACTION_URL =
  'https://108480-jayeshappbuilder-development.adobeio-static.net/api/v1/web/JayeshAppBuilder/create-customer';
const GENERATE_CUSTOMER_TOKEN_ACTION_URL =
  'https://108480-jayeshappbuilder-development.adobeio-static.net/api/v1/web/JayeshAppBuilder/generate-customer-token';
/**
 * Call App Builder "create-customer" action
 * @param {Object} payload
 * @param {string} payload.firstname
 * @param {string} payload.lastname
 * @param {string} payload.email
 * @param {string} payload.password
 * @param {boolean} [payload.is_subscribed=true]
 */
export async function createCustomer({
  firstname,
  lastname,
  email,
  password,
  is_subscribed = true,
}) {
  const res = await fetch(CREATE_CUSTOMER_ACTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      firstname,
      lastname,
      email,
      password,
      is_subscribed,
    }),
  });

  const text = await res.text();

  if (!res.ok) {
    console.error('❌ createCustomer action failed:', res.status, text);
    throw new Error(`createCustomer failed: ${res.status} ${text}`);
  }

  let json;
  try {
    json = JSON.parse(text);
  } catch (e) {
    console.error('❌ Invalid JSON from createCustomer:', e, text);
    throw new Error('Invalid JSON from createCustomer action');
  }

  return json; // this is whatever your action returned (GraphQL response)
}

/**
 * Call App Builder "generate-customer-token" action
 * @param {Object} payload
 * @param {string} payload.email
 * @param {string} payload.password
 */
export async function generateCustomerToken({ email, password }) {
  const res = await fetch(GENERATE_CUSTOMER_TOKEN_ACTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password,
    }),
  });

  const text = await res.text();

  if (!res.ok) {
    console.error('❌ generateCustomerToken action failed:', res.status, text);
    throw new Error(`generateCustomerToken failed: ${res.status} ${text}`);
  }

  let json;
  try {
    json = JSON.parse(text);
  } catch (e) {
    console.error('❌ Invalid JSON from generateCustomerToken:', e, text);
    throw new Error('Invalid JSON from generateCustomerToken action');
  }

  // If you used the code I gave for the action, token is in body.token
  const token = json?.body?.token ?? json?.token ?? null;
  return { raw: json, token };
}
