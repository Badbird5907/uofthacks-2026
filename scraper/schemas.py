from pydantic import BaseModel, Field
from typing import List, Optional


class Location(BaseModel):
    city: str
    remote_preference: bool


class Profile(BaseModel):
    platform: str  # LinkedIn, GitHub, Twitter, etc.
    url: str
    bio_summary: Optional[str] = None
    handle: Optional[str] = None  # For GitHub/Twitter/Social


class Basics(BaseModel):
    name: str
    current_occupation: str
    location: Location
    profiles: List[Profile]
    identity_tags: List[str]  # AI-generated tags like "Problem Solver", "Visual Thinker"


class ExperienceItem(BaseModel):
    company: str
    title: str
    duration: str
    impact_metrics: List[str]  # Quantifiable wins
    cultural_context: str  # e.g., "Fast-paced startup environment"


class Skills(BaseModel):
    hard_skills: List[str]
    soft_skills: List[str]
    tools: List[str]


class ProfessionalDNA(BaseModel):
    experience: List[ExperienceItem]
    skills: Skills


class EducationItem(BaseModel):
    institution: str
    degree: str
    focus: str


class Project(BaseModel):
    name: str
    link: str
    description: str
    role: str
    tech_stack: List[str]


class HobbiesAndInterests(BaseModel):
    active_pursuits: List[str]  # Things they DO (e.g., "Marathon running")
    intellectual_interests: List[str]  # Things they STUDY (e.g., "Quantum Computing")


class VolunteeringItem(BaseModel):
    organization: str
    cause: str
    role: str


class PersonalDNA(BaseModel):
    education: List[EducationItem]
    projects: List[Project]
    hobbies_and_interests: HobbiesAndInterests
    volunteering: List[VolunteeringItem]


class IdentityMappingVitals(BaseModel):
    communication_style: str  # Derived from social/resume tone
    value_alignment: List[str]  # e.g., "Transparency", "Autonomy"
    career_trajectory: str  # e.g., "Specialist-to-Generalist transition"


class PersonSchema(BaseModel):
    basics: Basics
    professional_dna: ProfessionalDNA
    personal_dna: PersonalDNA
    identity_mapping_vitals: IdentityMappingVitals
    extra: str  # Any other detailed description gathered from scraping
