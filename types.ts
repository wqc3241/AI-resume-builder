
export interface Keywords {
  hard_skills: string[];
  strategic_skills: string[];
  soft_skills: string[];
  qualifications: string[];
  action_verbs: string[];
  jd_phrases: string[];
}

export interface Experience {
  company: string;
  title: string;
  startDate: string;
  endDate: string;
  bullets: string[];
}

export interface Education {
  school: string;
  degree: string;
  startDate: string;
  endDate: string;
}

export interface ContactInfo {
  name: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  portfolio: string;
}

export interface RefinedResume {
  experiences: Experience[];
  suggested_skills: string;
  ats_tips: string[];
}

export interface AtsScanResult {
  overall_score: number;
  keyword_match: {
    score: number;
    matched: string[];
    missing: string[];
  };
  structure: {
    score: number;
    checks: { name: string; passed: boolean }[];
  };
  recommendations: string[];
}

export interface AnalysisResult {
  keywords: string[];
  explanation: string;
}
