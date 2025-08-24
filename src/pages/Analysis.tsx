// src/pages/Analysis.tsx

import React, { useState } from 'react'; // <--- THIS LINE IS NOW FIXED
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Search,
  AlertCircle,
  Sparkles,
  Award,
  ShieldAlert,
  Leaf,
  TriangleAlert,
  Weight,
  CheckCircle,
} from 'lucide-react';

//================================================================================
// 1. TYPE DEFINITIONS (Matching the server's expected JSON output)
//================================================================================
interface FoodPreference {
  category: 'veg' | 'non-veg' | 'egg';
  description: string;
}
interface HealthGrade {
  grade: 'A' | 'B' | 'C' | 'D' | 'E';
  title: string;
  description: string;
  factors: string[];
}
interface RiskAssessment {
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  description: string;
}
interface AllergenAlert {
  allergen: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
  icon: string;
}
interface AllergenAnalysis {
  hasAllergens: boolean;
  alerts: AllergenAlert[];
}
interface NutritionFacts {
  servingSize: string;
  nutrients: Record<string, string | number>;
}
interface FullAnalysisResult {
  foodPreference?: FoodPreference;
  healthGrade?: HealthGrade;
  riskAssessment?: RiskAssessment;
  allergenAnalysis?: AllergenAnalysis;
  nutritionFacts?: NutritionFacts;
}

//================================================================================
// 2. PROMPTS FOR THE BACKEND LLM
//================================================================================
const PROMPTS = {
  foodPreference: {
    query:
      "Analyze the food product and determine if it's vegetarian, non-vegetarian, or contains eggs. Provide a clear classification.",
    expectedFormat: `Return JSON in this exact format:\n{\n  "category": "veg|non-veg|egg",\n  "description": "Brief explanation of why this classification was chosen"\n}`,
  },
  healthGrade: {
    query:
      "Grade this food product's healthiness from A (excellent) to E (poor) based on ingredients, nutritional value, processing level, and overall health impact.",
    expectedFormat: `Return JSON in this exact format:\n{\n  "grade": "A|B|C|D|E",\n  "title": "Short title like 'Excellent Choice' or 'Poor Quality'",\n  "description": "2-3 sentence explanation of why this grade was given",\n  "factors": ["factor1", "factor2", "factor3"]\n}`,
  },
  riskAssessment: {
    query:
      'Assess the health risk level of this product for a general consumer. Rate from 1-100 where 1 is lowest risk and 100 is highest risk.',
    expectedFormat: `Return JSON in this exact format:\n{\n  "riskScore": 25,\n  "riskLevel": "low|medium|high",\n  "description": "Brief explanation of the primary risk factors"\n}`,
  },
  allergenAnalysis: {
    query:
      "Identify potential common allergens (like nuts, gluten, dairy, soy) in this product. Provide specific warnings if present.",
    expectedFormat: `Return JSON in this exact format:\n{\n  "hasAllergens": true,\n  "alerts": [\n    {\n      "allergen": "allergen name",\n      "severity": "high|medium|low",\n      "description": "Specific warning message",\n      "icon": "⚠️"\n    }\n  ]\n}`,
  },
  nutritionFacts: {
    query:
      'Extract and calculate nutritional information per serving including calories, protein, fat, carbohydrates, fiber, sugar, and sodium. Infer values if not explicitly present.',
    expectedFormat: `Return JSON in this exact format:\n{\n  "servingSize": "100g",\n  "nutrients": {\n    "Calories": 250,\n    "Protein": "12g",\n    "Total Fat": "8g",\n    "Carbohydrates": "35g",\n    "Dietary Fiber": "3g",\n    "Total Sugars": "5g",\n    "Sodium": "450mg"\n  }\n}`,
  },
};

//================================================================================
// 3. API HELPER FUNCTIONS
//================================================================================
const API_BASE_URL = 'http://localhost:3000';

const parseWebsite = async (url: string) => {
  const response = await fetch(`${API_BASE_URL}/parse-website`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ error: 'Failed to parse website content.' }));
    throw new Error(errorData.error);
  }
  return response.json();
};

const fetchAnalysis = async (query: string, expectedFormat: string) => {
  const fullPrompt = `${query}\n\n${expectedFormat}`;
  const response = await fetch(`${API_BASE_URL}/llm-call`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: fullPrompt }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API call failed: ${errorText}`);
  }
  const data = await response.json();
  try {
    if (typeof data.answer === 'object') {
      return data.answer;
    }
    const jsonMatch = data.answer.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('No valid JSON found in LLM response.');
  } catch (e) {
    console.error('JSON parsing error:', e, 'Raw response:', data.answer);
    throw new Error('Invalid JSON format received from the server.');
  }
};

//================================================================================
// 4. DISPLAY COMPONENTS
//================================================================================
const FoodPreferenceCard = ({ data }: { data: FoodPreference }) => {
  const icon =
    data.category === 'veg' ? '🌱' : data.category === 'non-veg' ? '🍖' : '🥚';
  const text =
    data.category === 'veg'
      ? 'Vegetarian'
      : data.category === 'non-veg'
      ? 'Non-Vegetarian'
      : 'Contains Egg';
  return (
    <Card className="card-hover">
      <CardHeader>
        <CardTitle>Food Category</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center text-center">
        <span className="text-6xl mb-2">{icon}</span>
        <h3 className="text-2xl font-bold text-gray-800">{text}</h3>
        <p className="mt-2 text-gray-600 text-sm">{data.description}</p>
      </CardContent>
    </Card>
  );
};
const gradeConfig: {
  [key in 'A' | 'B' | 'C' | 'D' | 'E']: {
    bg: string;
    border: string;
    text: string;
  };
} = {
  A: { bg: 'bg-green-100', border: 'border-green-200', text: 'text-green-600' },
  B: { bg: 'bg-teal-100', border: 'border-teal-200', text: 'text-teal-600' },
  C: {
    bg: 'bg-yellow-100',
    border: 'border-yellow-200',
    text: 'text-yellow-600',
  },
  D: {
    bg: 'bg-orange-100',
    border: 'border-orange-200',
    text: 'text-orange-600',
  },
  E: { bg: 'bg-red-100', border: 'border-red-200', text: 'text-red-600' },
};
const HealthGradeCard = ({ data }: { data: HealthGrade }) => {
  const config = gradeConfig[data.grade];
  return (
    <Card className="card-hover">
      <CardHeader>
        <CardTitle>Health Grade</CardTitle>
      </CardHeader>
      <CardContent className="text-center">
        <div
          className={`mx-auto w-32 h-32 rounded-full flex items-center justify-center ${config.bg} border-4 ${config.border}`}
        >
          <span className={`text-6xl font-bold ${config.text}`}>
            {data.grade}
          </span>
        </div>
        <h3 className="mt-4 text-2xl font-bold text-gray-800">{data.title}</h3>
        <p className="mt-2 text-gray-600">{data.description}</p>
        <div className="mt-4 text-left">
          <h4 className="font-semibold text-gray-700">Key Factors:</h4>
          <ul className="mt-2 space-y-1">
            {data.factors.map((factor) => (
              <li
                key={factor}
                className="flex items-center gap-2 text-sm text-gray-600"
              >
                <CheckCircle className="w-4 h-4 text-green-500" />
                {factor}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
const RiskMeterCard = ({ data }: { data: RiskAssessment }) => {
  const rotation = (data.riskScore - 50) * 1.8;
  const riskColor =
    data.riskLevel === 'low'
      ? 'text-green-600'
      : data.riskLevel === 'medium'
      ? 'text-yellow-600'
      : 'text-red-600';
  return (
    <Card className="card-hover">
      <CardHeader>
        <CardTitle>Health Risk Assessment</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="risk-meter mx-auto">
          <div
            className="meter-needle"
            style={{ transform: `translateX(-50%) rotate(${rotation}deg)` }}
          ></div>
        </div>
        <p className="mt-4 text-center text-gray-600">
          <span className={`font-bold ${riskColor}`}>
            {data.riskLevel.toUpperCase()} RISK
          </span>
          : {data.description}
        </p>
      </CardContent>
    </Card>
  );
};
const AllergenCard = ({ data }: { data: AllergenAnalysis }) => (
  <Card className="card-hover">
    <CardHeader>
      <CardTitle>Allergen Analysis</CardTitle>
    </CardHeader>
    <CardContent>
      {!data.hasAllergens ? (
        <p className="text-green-600">No common allergens detected.</p>
      ) : (
        <div className="space-y-3">
          {data.alerts.map((alert) => (
            <div key={alert.allergen} className="flex items-start gap-3">
              <span className="text-xl mt-1">{alert.icon}</span>
              <div>
                <p className="font-semibold text-gray-800">{alert.allergen}</p>
                <p className="text-sm text-gray-600">{alert.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </CardContent>
  </Card>
);
const NutritionCard = ({ data }: { data: NutritionFacts }) => (
  <Card className="card-hover h-full">
    <CardHeader>
      <CardTitle>Nutrition Facts</CardTitle>
      <CardDescription>Per {data.servingSize}</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="space-y-2">
        {Object.entries(data.nutrients).map(([key, value]) => (
          <div
            key={key}
            className="flex justify-between items-baseline border-b pb-2 last:border-b-0"
          >
            <span className="font-medium text-gray-700">{key}</span>
            <span className="font-semibold text-gray-900">{value}</span>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

//================================================================================
// 5. MAIN DASHBOARD COMPONENT
//================================================================================

const Analysis: React.FC = () => {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState('');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<FullAnalysisResult | null>(null);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) {
      setError('Please enter a product URL.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResults(null);
    setProgress(0);

    const analysisSteps = [
      { key: 'foodPreference', prompt: PROMPTS.foodPreference, stage: '2/6 - Analyzing food category...' },
      { key: 'healthGrade', prompt: PROMPTS.healthGrade, stage: '3/6 - Calculating health grade...' },
      { key: 'riskAssessment', prompt: PROMPTS.riskAssessment, stage: '4/6 - Assessing health risks...' },
      { key: 'allergenAnalysis', prompt: PROMPTS.allergenAnalysis, stage: '5/6 - Checking for allergens...' },
      { key: 'nutritionFacts', prompt: PROMPTS.nutritionFacts, stage: '6/6 - Extracting nutrition facts...' },
    ];

    const totalSteps = analysisSteps.length + 1; // +1 for parsing

    try {
      // Step 1: Parse the website. This must succeed to continue.
      setLoadingStage('1/6 - Parsing website content...');
      await parseWebsite(url);
      setProgress(100 / totalSteps);

      // Step 2: Run all LLM analyses in parallel.
      const analysisPromises = analysisSteps.map(async (step) => {
        setLoadingStage(step.stage);
        const result = await fetchAnalysis(step.prompt.query, step.prompt.expectedFormat);
        setProgress((prev) => prev + 100 / totalSteps);
        return { [step.key]: result };
      });

      const settledResults = await Promise.allSettled(analysisPromises);
      
      const finalResults: FullAnalysisResult = settledResults.reduce((acc, result) => {
        if (result.status === 'fulfilled') {
          return { ...acc, ...result.value };
        } else {
          // Log specific error for the failed analysis part
          console.error("A part of the analysis failed:", result.reason);
          return acc;
        }
      }, {});

      if (Object.keys(finalResults).length === 0) {
        throw new Error("All analysis steps failed. Please check the server logs.");
      }
      
      setResults(finalResults);
      setProgress(100);

    } catch (err: any) {
      setError(err.message || 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50/50 p-4 sm:p-6 md:p-8">
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.5s ease-in-out; }
        .card-hover { transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out; }
        .card-hover:hover { transform: translateY(-5px); box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1); }
        .risk-meter { width: 200px; height: 100px; position: relative; overflow: hidden; border-radius: 100px 100px 0 0; background: conic-gradient(from -90deg at 50% 100%, #10b981, #f59e0b, #ef4444); border: 10px solid #f3f4f6; }
        .meter-needle { position: absolute; bottom: 0; left: 50%; width: 4px; height: 90px; background: #1f2937; transform-origin: bottom center; transition: transform 0.8s cubic-bezier(0.68, -0.55, 0.27, 1.55); border-radius: 4px 4px 0 0; }
      `}</style>
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-extrabold text-gray-800 tracking-tight">
            Product Analysis Dashboard
          </h1>
          <p className="mt-2 text-lg text-gray-500">
            Enter a product URL to get an instant health and nutritional
            analysis.
          </p>
        </header>

        <Card className="mb-8 shadow-lg">
          <CardContent className="p-6">
            <form
              onSubmit={handleAnalyze}
              className="flex flex-col sm:flex-row items-center gap-4"
            >
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="url"
                  placeholder="https://www.amazon.in/dp/..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="pl-10 h-12 text-lg"
                  disabled={isLoading}
                />
              </div>
              <Button
                type="submit"
                size="lg"
                className="h-12 w-full sm:w-auto"
                disabled={isLoading}
              >
                {isLoading ? 'Analyzing...' : 'Analyze Product'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {isLoading && (
          <div className="text-center">
            <h3 className="text-xl font-semibold text-health-primary mb-2">
              {loadingStage}
            </h3>
            <Progress value={progress} className="w-full max-w-lg mx-auto" />
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Analysis Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!isLoading && !results && (
          <div className="text-center py-16 px-6 bg-white rounded-lg shadow-md border">
            <Sparkles className="mx-auto h-12 w-12 text-gray-300" />
            <h2 className="mt-4 text-2xl font-semibold text-gray-700">
              Ready for Analysis
            </h2>
            <p className="mt-2 text-gray-500">
              Your product insights will appear here once you submit a URL.
            </p>
          </div>
        )}

        {results && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fadeIn">
            <div className="flex flex-col gap-6">
              {results.foodPreference && <FoodPreferenceCard data={results.foodPreference} />}
              {results.healthGrade && <HealthGradeCard data={results.healthGrade} />}
            </div>
            <div className="flex flex-col gap-6">
              {results.riskAssessment && <RiskMeterCard data={results.riskAssessment} />}
              {results.allergenAnalysis && <AllergenCard data={results.allergenAnalysis} />}
            </div>
            <div className="md:col-span-2 lg:col-span-1">
              {results.nutritionFacts && <NutritionCard data={results.nutritionFacts} />}
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default Analysis;