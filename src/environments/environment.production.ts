// Same host ports as the dev file. nginx serves this build on http://localhost:4280,
// and the browser still calls Keycloak and the API on the published Compose ports.
export const environment = {
  production: true,
  apiBaseUrl: 'http://localhost:8088',
  keycloak: {
    url: 'http://localhost:8080',
    realm: 'quickbank',
    clientId: 'quickbank-spa',
  },
};
