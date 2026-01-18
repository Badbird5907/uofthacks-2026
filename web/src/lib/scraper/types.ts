export interface ScrapedCandidateInfo {
  basics: {
    current_occupation: string;
    identity_tags: string[];
    location: {
      city: string;
      remote_preference: boolean;
    };
    name: string;
    profiles: Profile[];
  };
  extra: string;
  identity_mapping_vitals: {
    career_trajectory: string;
    communication_style: string;
    value_alignment: string[];
  };
  personal_dna: {
    education: Education[];
    hobbies_and_interests: {
      active_pursuits: string[];
      intellectual_interests: string[];
    };
    projects: Project[];
    volunteering: Volunteering[];
  };
  professional_dna: {
    experience: Experience[];
    skills: {
      hard_skills: string[];
      soft_skills: string[];
      tools: string[];
    };
  };
}

export interface Profile {
  bio_summary: string;
  platform: string;
  url: string;
}

export interface Education {
  degree: string;
  focus: string;
  institution: string;
}

export interface Project {
  description: string;
  link: string;
  name: string;
  role: string;
  tech_stack: string[];
}

export interface Volunteering {
  cause: string;
  organization: string;
  role: string;
}

export interface Experience {
  company: string;
  cultural_context: string;
  duration: string;
  impact_metrics: string[];
  title: string;
}
