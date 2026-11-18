CREATE DATABASE IF NOT EXISTS ecommerce
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

CREATE DATABASE IF NOT EXISTS ecommerce_test
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS ecommerce.products (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  productToken VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  stock INT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_products_product_token (productToken),
  CONSTRAINT chk_products_price_nonnegative CHECK (price >= 0)
) ENGINE=InnoDB DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS ecommerce_test.products LIKE ecommerce.products;

GRANT ALL PRIVILEGES ON ecommerce.* TO 'products_app'@'%';
GRANT ALL PRIVILEGES ON ecommerce_test.* TO 'products_app'@'%';
