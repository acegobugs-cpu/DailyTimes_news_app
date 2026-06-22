CREATE table articles (
    id int UNSIGNED AUTO_INCREMENT PRIMARY KEY NOT NULL,
    tag VARCHAR(50) NOT NULL,
    media JSON DEFAULT NULL,
    published_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);


CREATE TABLE article_locale (
    id int UNSIGNED PRIMARY key AUTO_INCREMENT not NULL,
    article_id int UNSIGNED NOT null,
    editor_id int UNSIGNED NOT NULL,
    locale VARCHAR(10) NOT NULL,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    content JSON DEFAULT NULL,
    published_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
    FOREIGN KEY (editor_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_locale_slug (locale, slug)
);

CREATE INDEX idx_locale ON article_locale(locale);
CREATE INDEX idx_article_id ON article_locale(article_id);
ALTER TABLE article_locale
ADD FULLTEXT(title, description);

CREATE TABLE categories (
  id int UNSIGNED NOT NULL AUTO_INCREMENT,
  name varchar(100) NOT NULL,
  slug varchar(100) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY name (name),
  UNIQUE KEY slug (slug)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE article_category (
  article_id INT UNSIGNED NOT NULL,
  category_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (article_id, category_id),
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

CREATE TABLE authorized_emails (
  id int UNSIGNED NOT NULL AUTO_INCREMENT,
  slug varchar(255) NOT NULL,
  email varchar(255) NOT NULL,
  used tinyint(1) DEFAULT 0,
  created_at datetime DEFAULT current_timestamp(),
  inviter_id int UNSIGNED DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY slug (slug),
  UNIQUE KEY email (email),
  KEY inviter_id (inviter_id),
  CONSTRAINT authorized_emails_ibfk_1 FOREIGN KEY (inviter_id) REFERENCES users (id) on DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE users (
  id int UNSIGNED NOT NULL AUTO_INCREMENT,
  uid varchar(255) NOT NULL,
  fname varchar(100) NOT NULL,
  mname varchar(100) DEFAULT NULL,
  lname varchar(100) NOT NULL,
  uname varchar(100) NOT NULL,
  email varchar(255) NOT NULL,
  h_password text NOT NULL,
  is_superuser tinyint(1) DEFAULT 0,
  created_at datetime DEFAULT current_timestamp(),
  PRIMARY KEY (id),
  UNIQUE KEY uid (uid),
  UNIQUE KEY uname (uname),
  UNIQUE KEY email (email)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;