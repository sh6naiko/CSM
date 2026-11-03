export const commonPasswordSet = new Set([
  "12345678",
  "123456789",
  "1234567890",
  "password",
  "password1",
  "password123",
  "qwerty123",
  "qwerty12345",
  "11111111",
  "00000000",
  "87654321",
  "admin123",
  "abc12345",
  "iloveyou",
  "letmein",
  "welcome1",
  "monkey123",
  "dragon123",
  "football1",
  "baseball1",
]);
export const isCommonPassword = (value) =>
  commonPasswordSet.has(
    String(value ?? "")
      .trim()
      .toLowerCase(),
  );
export const measurePasswordStrength = (value) => {
  const password = String(value ?? "");
  if (!password)
    return {
      strength: "",
      label: "",
      advice: "",
    };
  const common = isCommonPassword(password);
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (common) score = 0;
  const strength =
    common || password.length < 8 || score <= 2
      ? "weak"
      : score <= 4
        ? "fair"
        : score <= 6
          ? "good"
          : "strong";
  const advice = common
    ? "This password is commonly used. Choose a less predictable one."
    : strength === "weak"
      ? "Try 12 or more characters and mix letters, numbers, or symbols."
      : strength === "fair"
        ? "Add more length or another character type to strengthen it."
        : strength === "good"
          ? "Good. A longer, less predictable passphrase can make it stronger."
          : "Strong password. Keep it unique to this account.";
  return {
    strength,
    label: strength[0].toUpperCase() + strength.slice(1),
    advice,
  };
};
