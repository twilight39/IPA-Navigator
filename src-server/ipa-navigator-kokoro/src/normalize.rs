use regex::Regex;

/// Normalizes text for text-to-speech processing by performing basic cleaning and expanding common abbreviations.
pub fn normalize_text(text: &str) -> String {
    if text.is_empty() {
        return String::new();
    }

    // First, normalize whitespace
    let whitespace_re = Regex::new(r"\s+").unwrap();
    let mut text = whitespace_re.replace_all(text, " ").to_string();

    // Convert common typographic characters to ASCII equivalents
    text = text
        .replace('\u{2018}', "'") // Left single quote
        .replace('\u{2019}', "'") // Right single quote
        .replace('\u{201C}', "\"") // Left double quote
        .replace('\u{201D}', "\""); // Right double quote

    // Expand common abbreviations that affect pronunciation
    // Use word boundaries (\b) to ensure we only match full words
    let abbrev_expansions = [
        (r"\bDr\.", "Doctor"),
        (r"\bMr\.", "Mister"),
        (r"\bMrs\.", "Missus"),
        (r"\bMs\.", "Miss"),
        (r"\bSt\.", "Street"),
        (r"\bAve\.", "Avenue"),
        (r"\bRd\.", "Road"),
        (r"\bBlvd\.", "Boulevard"),
        (r"\betc\.", "etcetera"),
    ];

    for (pattern, replacement) in abbrev_expansions.iter() {
        let re = Regex::new(pattern).unwrap();
        text = re.replace_all(&text, *replacement).to_string();
    }

    // Basic number formatting (optional, remove if your TTS handles these well)
    // Replace ranges with "to"
    let range_re = Regex::new(r"(\d+)-(\d+)").unwrap();
    text = range_re.replace_all(&text, "$1 to $2").to_string();

    // Remove commas between digits
    let comma_re = Regex::new(r"(\d),(\d)").unwrap();
    text = comma_re.replace_all(&text, "$1$2").to_string();

    text.trim().to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_normalize_text() {
        assert_eq!(normalize_text("  Hello,  world!  "), "Hello, world!");
        assert_eq!(normalize_text(""), "");
        assert_eq!(
            normalize_text("\n\t Multiple \n lines \t"),
            "Multiple lines"
        );

        // Test abbreviation expansion
        assert_eq!(normalize_text("Dr. Smith"), "Doctor Smith");
        assert_eq!(
            normalize_text("Visit Mr. Jones at 123 Main St."),
            "Visit Mister Jones at 123 Main Street"
        );

        // Test quote normalization
        assert_eq!(
            normalize_text("She said, \u{201C}Hello!\u{201D}"),
            "She said, \"Hello!\""
        );

        // Test number formatting
        assert_eq!(normalize_text("Ages 5-12 welcome"), "Ages 5 to 12 welcome");
        assert_eq!(normalize_text("$1,000,000"), "$1000000");
    }
}
