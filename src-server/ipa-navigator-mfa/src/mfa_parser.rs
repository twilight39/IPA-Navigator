use anyhow::{Context, Result};
use std::fs::File;
use std::io::{BufRead, BufReader};
use std::path::Path;

/// Represents a segment from MFA output (either a word or phoneme)
#[derive(Debug, Clone)]
pub struct MfaSegment {
    pub begin: f64,
    pub end: f64,
    pub label: String,
    pub segment_type: String, // "word" or "phone"
}

/// Parse MFA TextGrid output file
pub fn parse_textgrid(path: impl AsRef<Path>) -> Result<Vec<MfaSegment>> {
    let file = File::open(path.as_ref()).context("Failed to open TextGrid file")?;
    let reader = BufReader::new(file);

    let mut lines = reader.lines();
    let mut segments = Vec::new();

    // Parse TextGrid format
    let mut current_tier = None;
    let mut parsing_interval = false;
    let mut xmin = 0.0;
    let mut xmax = 0.0;

    while let Some(Ok(line)) = lines.next() {
        let line = line.trim();

        // Track which tier we're in
        if line.contains("name = ") {
            if line.contains("\"words\"") {
                current_tier = Some("word");
            } else if line.contains("\"phones\"") {
                current_tier = Some("phone");
            } else {
                current_tier = None;
            }
            continue;
        }

        // Start of an interval
        if line.contains("intervals [") {
            parsing_interval = true;
            xmin = 0.0;
            xmax = 0.0;
            continue;
        }

        // Parse interval properties
        if parsing_interval {
            if line.contains("xmin = ") {
                xmin = line
                    .split('=')
                    .nth(1)
                    .and_then(|s| s.trim().parse::<f64>().ok())
                    .unwrap_or(0.0);
            } else if line.contains("xmax = ") {
                xmax = line
                    .split('=')
                    .nth(1)
                    .and_then(|s| s.trim().parse::<f64>().ok())
                    .unwrap_or(0.0);
            } else if line.contains("text = ") {
                // Extract text between quotes
                let text = line.split('"').nth(1).unwrap_or("").to_string();

                // End of an interval - create segment if in words or phones tier
                if let Some(tier_type) = current_tier {
                    // Include all segments, even empty ones
                    segments.push(MfaSegment {
                        begin: xmin,
                        end: xmax,
                        label: text,
                        segment_type: tier_type.to_string(),
                    });
                }

                parsing_interval = false;
            }
        }
    }

    Ok(segments)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_textgrid() -> Result<()> {
        // Path to the actual TextGrid file
        let path = Path::new("tests/input.TextGrid");

        // Only run this test if the file exists
        if path.exists() {
            let segments = parse_textgrid(path)?;

            // Verify we parsed segments correctly
            assert!(!segments.is_empty(), "Should parse segments from TextGrid");

            // Check that we have both word and phone segments
            let has_words = segments.iter().any(|s| s.segment_type == "word");
            let has_phones = segments.iter().any(|s| s.segment_type == "phone");

            assert!(has_words, "Should have word segments");
            assert!(has_phones, "Should have phone segments");

            // Check that timestamps are valid
            for segment in &segments {
                assert!(
                    segment.begin < segment.end,
                    "Segment should have valid timestamps"
                );
            }
        }

        Ok(())
    }
}
