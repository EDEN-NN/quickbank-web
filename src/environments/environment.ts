// Browser-facing URLs. They match the host ports docker-compose.yml publishes:
// API on 8088, Keycloak on 8080. The Angular dev server is http://localhost:4200.
// Do not point these at Docker DNS names (keycloak, app); the browser cannot resolve them.
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:8088',
  keycloak: {
    url: 'http://localhost:8080',
    realm: 'quickbank',
    clientId: 'quickbank-spa',
  },
};
