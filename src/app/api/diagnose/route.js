import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import connectDB from '@/app/lib/mongodb';
import Report from '@/app/models/Report';
import { saveReportToDatabase } from './saveReport';

export async function GET() {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const db = await connectDB();
        if (!db) {
            return NextResponse.json({
                success: true,
                reports: [],
                message: 'Database not configured'
            });
        }

        // Get user email from Clerk
        const user = await currentUser();
        const userEmail = user?.emailAddresses?.[0]?.emailAddress;

        if (!userEmail) {
            return NextResponse.json({
                success: true,
                reports: [],
                message: 'User email not found'
            });
        }

        // Fetch diagnosis reports using Mongoose model
        // Match by userId (Clerk ID) which is more reliable than email
        const diagnosisReports = await Report.find({ userId })
            .sort({ createdAt: -1 })
            .limit(50)
            .lean(); // Convert to plain JS objects

        return NextResponse.json({
            success: true,
            reports: diagnosisReports.map(report => ({
                id: report._id.toString(),
                symptoms: report.symptoms,
                additionalInfo: report.additionalInfo,
                diagnosis: report.diagnosis,
                urgencyLevel: report.urgencyLevel,
                createdAt: report.createdAt,
            })),
        });

    } catch (error) {
        console.error('Error fetching reports:', error);
        return NextResponse.json(
            { error: 'Failed to fetch reports', details: error.message },
            { status: 500 }
        );
    }
}


export async function POST(request) {
    try {
        const { symptoms, additionalInfo } = await request.json();

        const apiKey = process.env.GEMINI_API_KEY;


        if (!apiKey) {
            // Return accurate mock data based on symptoms
            console.log('⚠️ GEMINI API KEY NOT FOUND - Using FALLBACK rule-based system');
            return NextResponse.json({ ...generateAccurateResponse(symptoms, additionalInfo), source: 'fallback' });
        }

        console.log('✅ GEMINI API KEY FOUND - Using Gemini AI for diagnosis');

        const prompt = `You are an AI medical assistant. Analyze the following symptoms carefully and provide an accurate health assessment.

SYMPTOMS REPORTED (${symptoms.length} total):
${symptoms.map((s, i) => `${i + 1}. ${s}`).join('\n')}

${additionalInfo ? `ADDITIONAL INFORMATION FROM PATIENT:\n${additionalInfo}` : ''}

ANALYSIS INSTRUCTIONS:
1. Consider ALL symptoms together to identify patterns
2. Assess severity based on symptom combinations
3. Provide urgency level: "low" (minor, self-care), "medium" (monitor closely, may need doctor), "high" (see doctor soon), "emergency" (immediate medical attention)
4. Consider the additional information for context (duration, severity, etc.)
5. Be specific about dosages and frequencies
6. Include relevant warnings based on symptoms

IMPORTANT: Provide a thorough, accurate assessment. Always recommend professional consultation for serious symptoms.

Respond ONLY in this exact JSON format (no markdown, no code blocks):
{
  "possibleConditions": [
    {
      "name": "Condition name",
      "probability": "High/Medium/Low",
      "description": "Brief description explaining why this matches the symptoms",
      "matchingSymptoms": ["list", "of", "matching", "symptoms"]
    }
  ],
  "suggestedMedicines": [
    {
      "name": "Medicine name (generic)",
      "type": "OTC/Prescription",
      "dosage": "Exact dosage",
      "frequency": "How often (e.g., Every 6 hours, Twice daily)",
      "duration": "Duration (e.g., 3-5 days)",
      "purpose": "What it treats",
      "warnings": "Important warnings and contraindications"
    }
  ],
  "homeRemedies": [
    {
      "remedy": "Remedy name",
      "instructions": "Detailed instructions",
      "effectiveness": "High/Medium/Low"
    }
  ],
  "lifestyle": ["Specific lifestyle recommendations"],
  "whenToSeeDoctor": "Specific warning signs to watch for",
  "urgencyLevel": "low/medium/high/emergency",
  "overallAssessment": "A 2-3 sentence summary referencing the ${symptoms.length} symptoms analyzed",
  "analysisDetails": {
    "symptomCount": ${symptoms.length},
    "patternsIdentified": ["identified", "patterns"],
    "urgencyScore": 0-10
  }
}`;

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.4, maxOutputTokens: 8192 },
                }),
            }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('❌ Gemini API Error - Falling back to rule-based system');
            console.error('❌ Error:', errorData?.error?.message || response.statusText);
            // Fall back to rule-based system instead of failing
            return NextResponse.json({ ...generateAccurateResponse(symptoms, additionalInfo), source: 'fallback' });
        }

        const data = await response.json();
        const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!textContent) {
            console.log('⚠️ No content in Gemini response - Falling back to rule-based system');
            return NextResponse.json({ ...generateAccurateResponse(symptoms, additionalInfo), source: 'fallback' });
        }

        // console.log('🔍 Raw Gemini Response:', textContent.substring(0, 200) + '...'); // Debug logging

        let parsedResponse;
        try {
            // rigorous cleanup: remove markdown, find the first { and last }
            const jsonMatch = textContent.match(/\{[\s\S]*\}/);
            const jsonString = jsonMatch ? jsonMatch[0] : textContent;
            parsedResponse = JSON.parse(jsonString);
        } catch (e) {
            console.log('⚠️ Gemini API response parsing failed:', e.message);
            console.log('📝 Raw Text that failed parsing:', textContent);
            return NextResponse.json({ ...generateAccurateResponse(symptoms, additionalInfo), source: 'fallback' });
        }

        // Add analysisDetails if not present from Gemini
        if (!parsedResponse.analysisDetails) {
            parsedResponse.analysisDetails = {
                symptomCount: symptoms.length,
                patternsIdentified: [],
                urgencyScore: parsedResponse.urgencyLevel === 'emergency' ? 10 :
                    parsedResponse.urgencyLevel === 'high' ? 7 :
                        parsedResponse.urgencyLevel === 'medium' ? 4 : 2
            };
        }

        // Save report to database
        const responseData = {
            success: true,
            data: parsedResponse,
            symptomCount: symptoms.length,
            source: 'gemini',
            disclaimer: "This is AI-generated health information. Always consult a qualified healthcare provider for proper diagnosis and treatment."
        };

        // Try to save to database (non-blocking)
        saveReportToDatabase(symptoms, additionalInfo, parsedResponse).catch(err => {
            console.error('Failed to save report to database:', err.message);
        });

        return NextResponse.json(responseData);

    } catch (error) {
        console.error('❌ UNEXPECTED ERROR:', error.message);
        // Try to return fallback - if symptoms is defined
        try {
            const body = await request.clone().json().catch(() => ({}));
            if (body.symptoms?.length > 0) {
                console.log('⚠️ Falling back to rule-based system');
                return NextResponse.json({ ...generateAccurateResponse(body.symptoms, body.additionalInfo || ''), source: 'fallback' });
            }
        } catch { }

        return NextResponse.json({
            success: false,
            message: 'Failed to analyze symptoms. Please try again.',
            error: error.message
        }, { status: 500 });
    }
}

function generateAccurateResponse(symptoms, additionalInfo = '') {
    const symptomLower = symptoms.map(s => s.toLowerCase());
    const infoLower = (additionalInfo || '').toLowerCase();

    let conditions = [];
    let medicines = [];
    let remedies = [];
    let lifestyle = [];
    let urgencyScore = 0; // 0-10 scale
    let matchedPatterns = [];

    // Analyze symptom patterns for accurate assessment

    // RESPIRATORY PATTERN
    const respiratorySymptoms = symptomLower.filter(s =>
        s.includes('cough') || s.includes('breath') || s.includes('wheez') ||
        s.includes('congestion') || s.includes('nose') || s.includes('sneez')
    );

    if (respiratorySymptoms.length >= 2) {
        urgencyScore += 2;
        matchedPatterns.push('respiratory');

        if (symptomLower.some(s => s.includes('breath'))) {
            urgencyScore += 3; // Breathing issues are more serious
            conditions.push({
                name: "Respiratory Infection",
                probability: "High",
                description: "Multiple respiratory symptoms suggest an upper or lower respiratory tract infection",
                matchingSymptoms: respiratorySymptoms
            });
        } else {
            conditions.push({
                name: "Common Cold / Upper Respiratory Infection",
                probability: "High",
                description: "Classic cold symptoms with nasal and throat involvement",
                matchingSymptoms: respiratorySymptoms
            });
        }

        medicines.push({
            name: "Cetirizine (Antihistamine)",
            type: "OTC",
            dosage: "10mg tablet",
            frequency: "Once daily at bedtime",
            duration: "5-7 days",
            purpose: "Reduces congestion, runny nose, and sneezing",
            warnings: "May cause drowsiness. Avoid alcohol."
        });

        if (symptomLower.some(s => s.includes('cough'))) {
            medicines.push({
                name: "Dextromethorphan Cough Syrup",
                type: "OTC",
                dosage: "10-20ml",
                frequency: "Every 6-8 hours as needed",
                duration: "Up to 7 days",
                purpose: "Suppresses cough reflex",
                warnings: "Do not exceed 4 doses per day. Not for children under 6."
            });
        }

        remedies.push({
            remedy: "Steam Inhalation",
            instructions: "Inhale steam from hot water for 10-15 minutes, 2-3 times daily. Add eucalyptus oil for better effect.",
            effectiveness: "High"
        });
    }

    // FEVER + PAIN PATTERN (Flu-like)
    const feverSymptoms = symptomLower.filter(s =>
        s.includes('fever') || s.includes('chill') || s.includes('sweat')
    );
    const painSymptoms = symptomLower.filter(s =>
        s.includes('pain') || s.includes('ache') || s.includes('headache')
    );

    if (feverSymptoms.length > 0 && painSymptoms.length > 0) {
        urgencyScore += 4;
        matchedPatterns.push('flu-like');

        conditions.push({
            name: "Influenza (Flu) / Viral Infection",
            probability: "High",
            description: "Combination of fever with body aches is characteristic of viral infections like flu",
            matchingSymptoms: [...feverSymptoms, ...painSymptoms]
        });

        medicines.push({
            name: "Paracetamol (Acetaminophen)",
            type: "OTC",
            dosage: "500-1000mg",
            frequency: "Every 4-6 hours as needed",
            duration: "Until fever subsides (max 3 days)",
            purpose: "Reduces fever and relieves pain",
            warnings: "Maximum 4g per day. Avoid alcohol. Check other medications for paracetamol content."
        });

        medicines.push({
            name: "Ibuprofen",
            type: "OTC",
            dosage: "400mg",
            frequency: "Every 8 hours with food",
            duration: "3-5 days",
            purpose: "Anti-inflammatory, reduces fever and body aches",
            warnings: "Take with food. Avoid if you have stomach ulcers or kidney issues."
        });

        remedies.push({
            remedy: "Rest and Hydration",
            instructions: "Complete bed rest. Drink 8-10 glasses of water, herbal tea, or clear broths daily.",
            effectiveness: "High"
        });
    } else if (feverSymptoms.length > 0) {
        urgencyScore += 3;
        conditions.push({
            name: "Fever (Viral Origin)",
            probability: "Medium",
            description: "Isolated fever may indicate early viral infection",
            matchingSymptoms: feverSymptoms
        });

        medicines.push({
            name: "Paracetamol",
            type: "OTC",
            dosage: "500mg",
            frequency: "Every 6 hours if temperature > 100.4°F (38°C)",
            duration: "Until fever resolves",
            purpose: "Antipyretic (fever reducer)",
            warnings: "Maximum 4g per day. Monitor temperature regularly."
        });
    }

    // DIGESTIVE PATTERN
    const digestiveSymptoms = symptomLower.filter(s =>
        s.includes('nausea') || s.includes('vomit') || s.includes('diarrhea') ||
        s.includes('stomach') || s.includes('bloat') || s.includes('constipation') ||
        s.includes('heartburn') || s.includes('indigestion')
    );

    if (digestiveSymptoms.length >= 2) {
        urgencyScore += 2;
        matchedPatterns.push('digestive');

        if (symptomLower.some(s => s.includes('vomit') || s.includes('diarrhea'))) {
            urgencyScore += 2;
            conditions.push({
                name: "Gastroenteritis (Stomach Flu)",
                probability: "High",
                description: "Vomiting and/or diarrhea with stomach issues indicates gastroenteritis",
                matchingSymptoms: digestiveSymptoms
            });

            medicines.push({
                name: "Oral Rehydration Salts (ORS)",
                type: "OTC",
                dosage: "1 sachet in 1 liter of water",
                frequency: "Sip throughout the day, especially after each loose stool",
                duration: "Until symptoms resolve",
                purpose: "Prevents dehydration",
                warnings: "Essential treatment. Seek medical help if unable to keep fluids down."
            });

            medicines.push({
                name: "Ondansetron (for severe nausea)",
                type: "Prescription",
                dosage: "4mg",
                frequency: "Every 8 hours as needed",
                duration: "1-2 days",
                purpose: "Anti-nausea medication",
                warnings: "Consult doctor before use. May cause headache."
            });
        } else {
            conditions.push({
                name: "Dyspepsia / Indigestion",
                probability: "Medium",
                description: "Stomach discomfort and bloating suggest digestive issues",
                matchingSymptoms: digestiveSymptoms
            });

            medicines.push({
                name: "Antacid (Aluminum/Magnesium Hydroxide)",
                type: "OTC",
                dosage: "10-20ml or 1-2 tablets",
                frequency: "After meals and at bedtime",
                duration: "As needed, up to 2 weeks",
                purpose: "Neutralizes stomach acid",
                warnings: "Do not use for more than 2 weeks without consulting doctor."
            });
        }

        remedies.push({
            remedy: "BRAT Diet",
            instructions: "Eat only Bananas, Rice, Applesauce, and Toast for 24-48 hours. These are easy to digest.",
            effectiveness: "High"
        });

        remedies.push({
            remedy: "Ginger Tea",
            instructions: "Steep fresh ginger slices in hot water for 10 minutes. Drink warm, 2-3 times daily.",
            effectiveness: "Medium"
        });
    }

    // HEADACHE PATTERN
    const headacheSymptoms = symptomLower.filter(s =>
        s.includes('headache') || s.includes('migraine')
    );

    if (headacheSymptoms.length > 0) {
        if (!matchedPatterns.includes('flu-like')) {
            urgencyScore += 1;

            if (symptomLower.some(s => s.includes('migraine'))) {
                conditions.push({
                    name: "Migraine",
                    probability: "High",
                    description: "Migraine headaches often require specific treatment",
                    matchingSymptoms: headacheSymptoms
                });
                urgencyScore += 2;
            } else {
                conditions.push({
                    name: "Tension Headache",
                    probability: "High",
                    description: "Most common type of headache, often stress-related",
                    matchingSymptoms: headacheSymptoms
                });
            }

            medicines.push({
                name: "Ibuprofen",
                type: "OTC",
                dosage: "400mg",
                frequency: "Every 6-8 hours with food",
                duration: "As needed, max 3 days",
                purpose: "Pain relief and anti-inflammatory",
                warnings: "Take with food. Not for those with stomach issues."
            });
        }

        remedies.push({
            remedy: "Cold Compress",
            instructions: "Apply cold pack wrapped in cloth to forehead for 15-20 minutes. Rest in a dark, quiet room.",
            effectiveness: "High"
        });
    }

    // THROAT PATTERN
    const throatSymptoms = symptomLower.filter(s =>
        s.includes('throat') || s.includes('swallow') || s.includes('hoarse') || s.includes('gland')
    );

    if (throatSymptoms.length > 0) {
        urgencyScore += 1;

        conditions.push({
            name: "Pharyngitis (Sore Throat)",
            probability: "High",
            description: "Throat inflammation, commonly viral but could be bacterial",
            matchingSymptoms: throatSymptoms
        });

        medicines.push({
            name: "Throat Lozenges (Benzocaine/Menthol)",
            type: "OTC",
            dosage: "1 lozenge",
            frequency: "Every 2-3 hours as needed",
            duration: "Until symptoms improve (max 7 days)",
            purpose: "Soothes throat pain and irritation",
            warnings: "Do not exceed 12 lozenges per day."
        });

        remedies.push({
            remedy: "Salt Water Gargle",
            instructions: "Mix 1/2 teaspoon salt in 8oz warm water. Gargle for 30 seconds, spit out. Repeat 3-4 times daily.",
            effectiveness: "High"
        });
    }

    // MENTAL HEALTH PATTERN
    const mentalSymptoms = symptomLower.filter(s =>
        s.includes('anxiety') || s.includes('depression') || s.includes('stress') ||
        s.includes('insomnia') || s.includes('mood') || s.includes('irritabil')
    );

    if (mentalSymptoms.length >= 2) {
        urgencyScore += 2;
        matchedPatterns.push('mental');

        conditions.push({
            name: "Stress/Anxiety Symptoms",
            probability: "Medium",
            description: "Multiple mental health symptoms suggest elevated stress levels. Consider professional support.",
            matchingSymptoms: mentalSymptoms
        });

        if (symptomLower.some(s => s.includes('insomnia'))) {
            medicines.push({
                name: "Melatonin",
                type: "OTC",
                dosage: "3-5mg",
                frequency: "30 minutes before bedtime",
                duration: "2-4 weeks",
                purpose: "Natural sleep aid",
                warnings: "May cause morning grogginess. Not for long-term use."
            });
        }

        remedies.push({
            remedy: "Deep Breathing Exercise",
            instructions: "Breathe in for 4 seconds, hold for 7 seconds, exhale for 8 seconds. Repeat 4-5 times when feeling anxious.",
            effectiveness: "High"
        });

        lifestyle.push("Consider speaking with a mental health professional for ongoing support");
    }

    // SKIN PATTERN
    const skinSymptoms = symptomLower.filter(s =>
        s.includes('rash') || s.includes('itch') || s.includes('hive') || s.includes('skin')
    );

    if (skinSymptoms.length > 0) {
        urgencyScore += 1;

        conditions.push({
            name: "Allergic Skin Reaction / Dermatitis",
            probability: "Medium",
            description: "Skin symptoms may indicate allergic reaction or dermatitis",
            matchingSymptoms: skinSymptoms
        });

        medicines.push({
            name: "Diphenhydramine (Benadryl)",
            type: "OTC",
            dosage: "25-50mg",
            frequency: "Every 6 hours as needed",
            duration: "Until symptoms resolve",
            purpose: "Antihistamine for allergic reactions and itching",
            warnings: "Causes significant drowsiness. Do not drive or operate machinery."
        });

        medicines.push({
            name: "Hydrocortisone Cream 1%",
            type: "OTC",
            dosage: "Thin layer to affected area",
            frequency: "2-3 times daily",
            duration: "Up to 7 days",
            purpose: "Reduces inflammation and itching",
            warnings: "Do not use on face or broken skin. Stop if irritation occurs."
        });
    }

    // Analyze additional info for severity indicators
    if (infoLower) {
        if (infoLower.includes('severe') || infoLower.includes('intense') || infoLower.includes('unbearable')) {
            urgencyScore += 2;
        }
        if (infoLower.includes('week') || infoLower.includes('days') && infoLower.match(/\d+\s*days?/)) {
            const days = parseInt(infoLower.match(/(\d+)\s*days?/)?.[1] || '0');
            if (days > 7) urgencyScore += 2;
            else if (days > 3) urgencyScore += 1;
        }
        if (infoLower.includes('worse') || infoLower.includes('worsening') || infoLower.includes('getting bad')) {
            urgencyScore += 2;
        }
        if (infoLower.includes('blood') || infoLower.includes('bleeding')) {
            urgencyScore += 4;
        }
        if (infoLower.includes('child') || infoLower.includes('baby') || infoLower.includes('elderly') || infoLower.includes('pregnant')) {
            urgencyScore += 2;
        }
    }

    // Default if no patterns matched
    if (conditions.length === 0) {
        conditions.push({
            name: "General Discomfort",
            probability: "Low",
            description: "Symptoms don't form a clear pattern. Monitor and consult a doctor if they persist.",
            matchingSymptoms: symptoms
        });

        medicines.push({
            name: "Multivitamin Supplement",
            type: "OTC",
            dosage: "1 tablet",
            frequency: "Once daily with food",
            duration: "Ongoing",
            purpose: "General health support",
            warnings: "Follow package instructions."
        });
    }

    // Calculate urgency level
    let urgencyLevel = 'low';
    if (urgencyScore >= 8) urgencyLevel = 'emergency';
    else if (urgencyScore >= 6) urgencyLevel = 'high';
    else if (urgencyScore >= 3) urgencyLevel = 'medium';

    // Build standard lifestyle recommendations
    const standardLifestyle = [
        "Get 7-9 hours of quality sleep",
        "Stay hydrated - drink at least 8 glasses of water daily",
        "Avoid strenuous physical activity until symptoms improve",
        "Eat light, nutritious meals",
        "Wash hands frequently to prevent spread of infection"
    ];

    // Generate overall assessment
    let overallAssessment = '';
    if (symptoms.length === 1) {
        overallAssessment = `Based on your reported symptom (${symptoms[0]}), this appears to be a ${urgencyLevel === 'low' ? 'minor' : 'moderate'} concern. `;
    } else {
        overallAssessment = `Based on ${symptoms.length} reported symptoms, `;
        if (matchedPatterns.length > 0) {
            overallAssessment += `there is a pattern suggesting ${matchedPatterns.join(' and ')} involvement. `;
        }
    }

    if (additionalInfo) {
        overallAssessment += `Your additional notes have been considered in this assessment. `;
    }

    overallAssessment += urgencyLevel === 'low'
        ? "Self-care at home should be sufficient, but monitor for any worsening."
        : urgencyLevel === 'medium'
            ? "Monitor symptoms closely and consult a doctor if they persist beyond 48-72 hours."
            : "Please consult a healthcare provider soon for proper evaluation.";

    // When to see doctor based on symptoms
    let whenToSeeDoctor = "Consult a doctor if: ";
    const doctorReasons = [];

    if (feverSymptoms.length > 0) {
        doctorReasons.push("fever exceeds 103°F (39.4°C) or lasts more than 3 days");
    }
    if (respiratorySymptoms.length > 0) {
        doctorReasons.push("difficulty breathing or wheezing worsens");
    }
    if (digestiveSymptoms.length > 0) {
        doctorReasons.push("unable to keep fluids down or see blood in stool/vomit");
    }
    if (painSymptoms.length > 0) {
        doctorReasons.push("pain becomes severe or doesn't respond to OTC medications");
    }

    doctorReasons.push("symptoms persist beyond 7 days without improvement");
    doctorReasons.push("new symptoms develop");

    whenToSeeDoctor += doctorReasons.slice(0, 4).join("; ") + ".";

    return {
        success: true,
        data: {
            possibleConditions: conditions,
            suggestedMedicines: medicines,
            homeRemedies: remedies.length > 0 ? remedies : [{ remedy: "Rest", instructions: "Get adequate rest and sleep", effectiveness: "High" }],
            lifestyle: [...new Set([...lifestyle, ...standardLifestyle])],
            whenToSeeDoctor,
            urgencyLevel,
            overallAssessment,
            analysisDetails: {
                symptomCount: symptoms.length,
                patternsIdentified: matchedPatterns,
                urgencyScore: Math.min(urgencyScore, 10)
            }
        },
        symptomCount: symptoms.length,
        disclaimer: "This AI assessment is for informational purposes only. It is not a medical diagnosis. Always consult a qualified healthcare provider for proper diagnosis and treatment."
    };
}
