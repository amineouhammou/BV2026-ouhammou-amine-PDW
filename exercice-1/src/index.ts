interface DevProfile {
  name: string;
  city: string;
  experienceYears: number;
  available: boolean;
  weeklyHours: number;
  technologies: string[];
  favoriteEditor?: string;
}
const developerName: string = "Alex Martin";
const city: string = "Verviers";
const currentYear: number = 2026;
let startYear: number = 2024;
const experienceYears: number = currentYear - startYear;
const available: boolean = true;
let weeklyHours: number = 12;
const technologies: string[] = [
  
    "TypeScript",
  "Node.js",
  "Git"
];

technologies.push("PostgreSQL");
const profile: DevProfile = {
  name: developerName,
  city: city,
  experienceYears: experienceYears,
  available: available,
  weeklyHours: weeklyHours,
  technologies: technologies,
  favoriteEditor: "VS Code"
};
const profile2: DevProfile = {
  name: "Nicolas",
  city: "Liège",
  experienceYears: 20,
  available: true,
  weeklyHours: 40,
  technologies: ["TypeScript", "Git", "Node.js", "PostgreSQL", "C#"]

};
function getAvailabilityStatus(profile: DevProfile): string {
  if (profile.available && profile.weeklyHours >= 8) {
    return "DISPONIBLE";
  }
  return "INDISPONIBLE";
}
function computeProfileScore(profile: DevProfile): number {
    const score =
        profile.experienceYears * 10 +
        profile.technologies.length * 10 +
        profile.weeklyHours * 2;

    return Math.min(score, 100);
}
class Developer {
    name: string;
    city: string;
    experienceYears: number;
    available: boolean;
    weeklyHours: number;
    technologies: string[];
    favoriteEditor?: string;
constructor(
    name: string,
    city: string,
    experienceYears: number,
    available: boolean,
    weeklyHours: number,
    technologies: string[],
    favoriteEditor?: string
) {
    this.name = name;
    this.city = city;
    this.experienceYears = experienceYears;
    this.available = available;
    this.weeklyHours = weeklyHours;
    this.technologies = technologies;
    this.favoriteEditor = favoriteEditor;
  }
  getStatus(): string {
    return getAvailabilityStatus(this);
   }
   getScore(): number {
    return computeProfileScore(this);
  }
  printSummary(): void {
    console.log("=== DEVBOARD CLI ===");
    console.log(`Nom : ${this.name}`);
    console.log(`Ville : ${this.city}`);
    console.log(`Expérience : ${this.experienceYears} ans`);
    console.log(`Disponible : ${this.available}`);
    console.log(`Technos : ${this.technologies.join(", ")}`);
    console.log(`Charge : ${this.weeklyHours} h/semaine`);
    console.log(`Statut : ${this.getStatus()}`);
    console.log(`Score : ${this.getScore()}/100`);
    console.log("====================");
   }
}
const availabilityStatus: string = getAvailabilityStatus(profile);
const profileScore: number = computeProfileScore(profile);
console.log(`Technologies (${profile.technologies.length}) :`);
for (const technology of profile.technologies) {
  console.log(`- ${technology}`);
}

console.log(`Technos : ${profile.technologies.join(", ")}`);

console.log(`Nom : ${profile.name}`);
console.log(`Ville : ${profile.city}`);
console.log(`Expérience : ${profile.experienceYears} ans`);
console.log(`Disponible : ${profile.available}`);
console.log(`Charge : ${profile.weeklyHours} h/semaine`);
console.log(`Statut : ${availabilityStatus}`);
console.log(`Score : ${profileScore}/100`);
const developer = new Developer(
    "Amine",
      "Liège",
  20,
  true,
  40,
  ["TypeScript", "Git", "Node.js", "PostgreSQL", "C#"],
  "VS Code"
);

developer.printSummary();

