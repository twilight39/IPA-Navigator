use crate::constants::ASSETS_PATH;
use std::{path::PathBuf, sync::LazyLock};

#[derive(Debug, Clone, Copy, Hash, PartialEq, Eq)]
pub enum AmericanFemaleVoice {
    Bella,
    Nicole,
    Sky,
}

#[derive(Debug, Clone, Copy, Hash, PartialEq, Eq)]
pub enum AmericanMaleVoice {
    Fenrir,
    Michael,
    Puck,
}

#[derive(Debug, Clone, Copy, Hash, PartialEq, Eq)]
pub enum BritishFemaleVoice {
    Emma,
    Isabella,
    Lily,
}

#[derive(Debug, Clone, Copy, Hash, PartialEq, Eq)]
pub enum BritishMaleVoice {
    Fable,
    George,
    Lewis,
}

/// Represents the different voice types available in the Kokoro TTS system.
#[derive(Debug, Clone, Copy, Hash, PartialEq, Eq)]
pub enum VoiceType {
    AmericanFemale(AmericanFemaleVoice),
    AmericanMale(AmericanMaleVoice),
    BritishFemale(BritishFemaleVoice),
    BritishMale(BritishMaleVoice),
}

impl VoiceType {
    /// Returns the file name associated with the voice type.
    pub fn file_name(&self) -> &'static str {
        match self {
            VoiceType::AmericanFemale(voice) => match voice {
                AmericanFemaleVoice::Bella => "af_bella.bin",
                AmericanFemaleVoice::Nicole => "af_nicole.bin",
                AmericanFemaleVoice::Sky => "af_sky.bin",
            },
            VoiceType::AmericanMale(voice) => match voice {
                AmericanMaleVoice::Fenrir => "am_fenrir.bin",
                AmericanMaleVoice::Michael => "am_michael.bin",
                AmericanMaleVoice::Puck => "am_puck.bin",
            },
            VoiceType::BritishFemale(voice) => match voice {
                BritishFemaleVoice::Emma => "bf_emma.bin",
                BritishFemaleVoice::Isabella => "bf_isabella.bin",
                BritishFemaleVoice::Lily => "bf_lily.bin",
            },
            VoiceType::BritishMale(voice) => match voice {
                BritishMaleVoice::Fable => "bm_fable.bin",
                BritishMaleVoice::George => "bm_george.bin",
                BritishMaleVoice::Lewis => "bm_lewis.bin",
            },
        }
    }

    /// Returns the language code associated with the voice type.
    pub fn language(&self) -> &'static str {
        match self {
            VoiceType::AmericanFemale(_) | VoiceType::AmericanMale(_) => "en-us",
            VoiceType::BritishFemale(_) | VoiceType::BritishMale(_) => "en-gb",
        }
    }

    /// Returns the path to the voice file.
    pub fn path(&self) -> PathBuf {
        let voice_path = format!("{}/Kokoro/{}", *ASSETS_PATH, self.file_name());
        PathBuf::from(voice_path)
    }
}

pub static ALL_VOICES: LazyLock<[VoiceType; 12]> = LazyLock::new(|| {
    [
        VoiceType::AmericanFemale(AmericanFemaleVoice::Bella),
        VoiceType::AmericanFemale(AmericanFemaleVoice::Nicole),
        VoiceType::AmericanFemale(AmericanFemaleVoice::Sky),
        VoiceType::AmericanMale(AmericanMaleVoice::Fenrir),
        VoiceType::AmericanMale(AmericanMaleVoice::Michael),
        VoiceType::AmericanMale(AmericanMaleVoice::Puck),
        VoiceType::BritishFemale(BritishFemaleVoice::Emma),
        VoiceType::BritishFemale(BritishFemaleVoice::Isabella),
        VoiceType::BritishFemale(BritishFemaleVoice::Lily),
        VoiceType::BritishMale(BritishMaleVoice::Fable),
        VoiceType::BritishMale(BritishMaleVoice::George),
        VoiceType::BritishMale(BritishMaleVoice::Lewis),
    ]
});

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_voice_file_names() {
        assert_eq!(
            VoiceType::AmericanFemale(AmericanFemaleVoice::Bella).file_name(),
            "af_bella.bin"
        );
        assert_eq!(
            VoiceType::AmericanMale(AmericanMaleVoice::Fenrir).file_name(),
            "am_fenrir.bin"
        );
        assert_eq!(
            VoiceType::BritishFemale(BritishFemaleVoice::Emma).file_name(),
            "bf_emma.bin"
        );
        assert_eq!(
            VoiceType::BritishMale(BritishMaleVoice::Fable).file_name(),
            "bm_fable.bin"
        );
    }

    #[test]
    fn test_voice_paths() {
        let voice = VoiceType::AmericanFemale(AmericanFemaleVoice::Bella);
        assert!(voice.path().exists());
    }
}
