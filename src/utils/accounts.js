export const adminAvatarBackgrounds = {
  ember: "linear-gradient(145deg, #f47c59, #ed4e2d)",
  ocean: "linear-gradient(145deg, #5c8fe8, #243f86)",
  mint: "linear-gradient(145deg, #61c7a0, #247d68)",
  violet: "linear-gradient(145deg, #a580e8, #5b3c9a)",
  sunset: "linear-gradient(145deg, #f3bd56, #c85b30)",
  slate: "linear-gradient(145deg, #718096, #263246)",
};
export const getAccountInitials = (account) =>
  String(account.display_name || account.username || "?")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("") || "?";
