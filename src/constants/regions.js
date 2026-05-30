export const REGIONS = [
  { value: "south_east_asia",      label: "South East Asia"      },
  { value: "north_america",        label: "North America"        },
  { value: "south_america",        label: "South America"        },
  { value: "canada",               label: "Canada"               },
  { value: "middle_east",          label: "Middle East"          },
  { value: "africa",               label: "Africa"               },
  { value: "uk",                   label: "UK"                   },
  { value: "europe",               label: "Europe"               },
  { value: "russia",               label: "Russia"               },
  { value: "indian_sub_continent", label: "Indian Sub Continent" },
  { value: "australia_nz",         label: "Australia NZ"         },
].sort((a, b) => a.label.localeCompare(b.label, "en", { sensitivity: "base" }));
