use sqlparser::dialect::Dialect;

/// Minimal SAP HANA SQL dialect implementation
#[derive(Debug)]
pub struct HanaDialect;

impl HanaDialect {
    pub fn new() -> Self {
        Self
    }
}

impl Dialect for HanaDialect {
    /// HANA uses double quotes for identifier quoting
    fn identifier_quote_style(&self, _identifier: &str) -> Option<char> {
        Some('"')
    }

    /// HANA identifier rules - letters, digits, underscore, dollar
    fn is_identifier_start(&self, ch: char) -> bool {
        ch.is_ascii_lowercase() || ch.is_ascii_uppercase() || ch == '_' || ch == '$'
    }

    /// HANA identifier continuation rules
    fn is_identifier_part(&self, ch: char) -> bool {
        ch.is_ascii_lowercase()
            || ch.is_ascii_uppercase()
            || ch.is_ascii_digit()
            || ch == '_'
            || ch == '$'
            || ch == '#'
    }
}
