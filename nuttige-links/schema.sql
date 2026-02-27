-- =============================================================================
-- SCHEMA NUTTIGE LINKS
-- =============================================================================

DROP TABLE IF EXISTS links_history;
DROP TABLE IF EXISTS subsections_history;
DROP TABLE IF EXISTS sections_history;
DROP TABLE IF EXISTS links;
DROP TABLE IF EXISTS subsections;
DROP TABLE IF EXISTS sections;


-- =============================================================================
-- MAIN TABLES
-- =============================================================================

CREATE TABLE sections (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    position        INTEGER,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name)
);

CREATE TABLE subsections (
    id              TEXT PRIMARY KEY,
    section_id      TEXT NOT NULL,
    name            TEXT NOT NULL,
    position        INTEGER,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(section_id, name),
    FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE
);

CREATE TABLE links (
    id              TEXT PRIMARY KEY,
    subsection_id   TEXT NOT NULL,
    url             TEXT NOT NULL,
    text            TEXT NOT NULL,
    description     TEXT,
    position        INTEGER,
    last_checked    TIMESTAMP,
    last_status     INTEGER,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subsection_id) REFERENCES subsections(id) ON DELETE CASCADE
);


-- =============================================================================
-- HISTORY TABLES
-- =============================================================================

CREATE TABLE sections_history (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    section_id          TEXT NOT NULL,
    name                TEXT,
    position            INTEGER,
    mutation_type       TEXT NOT NULL,
    mutation_timestamp  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE subsections_history (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    subsection_id       TEXT NOT NULL,
    section_id          TEXT,
    name                TEXT,
    position            INTEGER,
    mutation_type       TEXT NOT NULL,
    mutation_timestamp  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE links_history (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    link_id             TEXT NOT NULL,
    subsection_id       TEXT,
    url                 TEXT,
    text                TEXT,
    description         TEXT,
    position            INTEGER,
    last_checked        TIMESTAMP,
    last_status         INTEGER,
    mutation_type       TEXT NOT NULL,
    mutation_timestamp  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- =============================================================================
-- TRIGGERS: updated_at
-- =============================================================================

CREATE TRIGGER update_sections_timestamp
AFTER UPDATE ON sections
FOR EACH ROW
BEGIN
    UPDATE sections SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

CREATE TRIGGER update_subsections_timestamp
AFTER UPDATE ON subsections
FOR EACH ROW
BEGIN
    UPDATE subsections SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

CREATE TRIGGER update_links_timestamp
AFTER UPDATE ON links
FOR EACH ROW
BEGIN
    UPDATE links SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;


-- =============================================================================
-- TRIGGERS: history
-- =============================================================================

-- Sections history
CREATE TRIGGER insert_sections_history
AFTER INSERT ON sections
FOR EACH ROW
BEGIN
    INSERT INTO sections_history (
        section_id, name, position, mutation_type
    ) VALUES (
        NEW.id, NEW.name, NEW.position, 'INSERT'
    );
END;

CREATE TRIGGER update_sections_history
AFTER UPDATE ON sections
FOR EACH ROW
BEGIN
    INSERT INTO sections_history (
        section_id, name, position, mutation_type
    ) VALUES (
        OLD.id, OLD.name, OLD.position, 'UPDATE'
    );
END;

CREATE TRIGGER delete_sections_history
BEFORE DELETE ON sections
FOR EACH ROW
BEGIN
    INSERT INTO sections_history (
        section_id, name, position, mutation_type
    ) VALUES (
        OLD.id, OLD.name, OLD.position, 'DELETE'
    );
END;

-- Subsections history
CREATE TRIGGER insert_subsections_history
AFTER INSERT ON subsections
FOR EACH ROW
BEGIN
    INSERT INTO subsections_history (
        subsection_id, section_id, name, position, mutation_type
    ) VALUES (
        NEW.id, NEW.section_id, NEW.name, NEW.position, 'INSERT'
    );
END;

CREATE TRIGGER update_subsections_history
AFTER UPDATE ON subsections
FOR EACH ROW
BEGIN
    INSERT INTO subsections_history (
        subsection_id, section_id, name, position, mutation_type
    ) VALUES (
        OLD.id, OLD.section_id, OLD.name, OLD.position, 'UPDATE'
    );
END;

CREATE TRIGGER delete_subsections_history
BEFORE DELETE ON subsections
FOR EACH ROW
BEGIN
    INSERT INTO subsections_history (
        subsection_id, section_id, name, position, mutation_type
    ) VALUES (
        OLD.id, OLD.section_id, OLD.name, OLD.position, 'DELETE'
    );
END;

-- Links history
CREATE TRIGGER insert_links_history
AFTER INSERT ON links
FOR EACH ROW
BEGIN
    INSERT INTO links_history (
        link_id, subsection_id, url, text, description,
        position, last_checked, last_status, mutation_type
    ) VALUES (
        NEW.id, NEW.subsection_id, NEW.url, NEW.text, NEW.description,
        NEW.position, NEW.last_checked, NEW.last_status, 'INSERT'
    );
END;

CREATE TRIGGER update_links_history
AFTER UPDATE ON links
FOR EACH ROW
BEGIN
    INSERT INTO links_history (
        link_id, subsection_id, url, text, description,
        position, last_checked, last_status, mutation_type
    ) VALUES (
        OLD.id, OLD.subsection_id, OLD.url, OLD.text, OLD.description,
        OLD.position, OLD.last_checked, OLD.last_status, 'UPDATE'
    );
END;

CREATE TRIGGER delete_links_history
BEFORE DELETE ON links
FOR EACH ROW
BEGIN
    INSERT INTO links_history (
        link_id, subsection_id, url, text, description,
        position, last_checked, last_status, mutation_type
    ) VALUES (
        OLD.id, OLD.subsection_id, OLD.url, OLD.text, OLD.description,
        OLD.position, OLD.last_checked, OLD.last_status, 'DELETE'
    );
END;
