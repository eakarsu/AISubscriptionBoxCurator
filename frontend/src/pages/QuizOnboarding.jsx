import React, { useState } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const steps = [
  {
    id: 'preferences',
    title: 'What are your interests?',
    description: 'Tell us what you love',
    field: 'preferences',
    type: 'checkboxes',
    options: ['Beauty & Skincare', 'Tech & Gadgets', 'Books & Literature', 'Fitness & Wellness', 'Coffee & Snacks', 'Art & Creativity', 'Gaming', 'Outdoor Adventures', 'Cooking & Food', 'Pets']
  },
  {
    id: 'lifestyle',
    title: 'How would you describe your lifestyle?',
    description: 'Help us personalize your experience',
    field: 'lifestyle',
    type: 'radio',
    options: ['Active & Outdoorsy', 'Homebody & Cozy', 'Creative & Artistic', 'Tech Enthusiast', 'Foodie & Gourmet', 'Wellness Focused']
  },
  {
    id: 'allergies',
    title: 'Any allergies or restrictions?',
    description: 'We want to keep you safe',
    field: 'allergies',
    type: 'text',
    placeholder: 'e.g., nuts, gluten, latex... or "none"'
  },
  {
    id: 'budget',
    title: 'What\'s your monthly budget?',
    description: 'For a subscription box',
    field: 'budget',
    type: 'radio',
    options: ['Under $25', '$25-$40', '$40-$60', '$60-$80', 'Over $80']
  },
  {
    id: 'hobbies',
    title: 'What do you do in your free time?',
    description: 'Your hobbies help us find the perfect match',
    field: 'hobbies',
    type: 'text',
    placeholder: 'e.g., hiking, reading, cooking, gaming...'
  }
];

export default function QuizOnboarding() {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({ preferences: [], lifestyle: '', allergies: '', budget: '', hobbies: '' });
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const step = steps[currentStep];

  const handleAnswer = (field, value, type) => {
    if (type === 'checkboxes') {
      setAnswers(prev => ({
        ...prev,
        [field]: prev[field].includes(value)
          ? prev[field].filter(v => v !== value)
          : [...prev[field], value]
      }));
    } else {
      setAnswers(prev => ({ ...prev, [field]: value }));
    }
  };

  const next = () => {
    if (currentStep < steps.length - 1) setCurrentStep(s => s + 1);
    else submitQuiz();
  };

  const submitQuiz = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/customers/quiz`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          preferences: Array.isArray(answers.preferences) ? answers.preferences.join(', ') : answers.preferences,
          allergies: answers.allergies,
          budget: answers.budget,
          hobbies: answers.hobbies,
          lifestyle: answers.lifestyle
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Quiz failed');
      setResults(data.quiz_results);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  if (results) {
    const boxes = results.top_boxes || [];
    return (
      <div style={{ maxWidth: '700px', margin: '2rem auto', padding: '2rem', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '2.5rem' }}>🎁</div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>Your Perfect Matches!</h1>
          {results.profile_summary && (
            <p style={{ color: '#6b7280', maxWidth: '500px', margin: '0 auto' }}>{results.profile_summary}</p>
          )}
        </div>

        {results.personalized_message && (
          <div style={{ background: '#eff6ff', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem', color: '#1d4ed8' }}>
            {results.personalized_message}
          </div>
        )}

        {boxes.length > 0 ? (
          <div>
            {boxes.map((box, i) => (
              <div key={i} style={{
                border: `2px solid ${i === 0 ? '#7c3aed' : '#e5e7eb'}`,
                borderRadius: '12px', padding: '1.5rem', marginBottom: '1rem',
                background: i === 0 ? '#faf5ff' : '#fff'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div>
                    {i === 0 && (
                      <span style={{ background: '#7c3aed', color: '#fff', fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', marginBottom: '0.5rem', display: 'inline-block' }}>
                        BEST MATCH
                      </span>
                    )}
                    <div style={{ fontWeight: 700, fontSize: '1.1rem', marginTop: '0.25rem' }}>{box.box_name || `Box #${box.box_id}`}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#7c3aed' }}>{box.match_score}%</div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>match score</div>
                  </div>
                </div>
                {box.personalized_pitch && (
                  <p style={{ color: '#4b5563', fontSize: '0.9rem', marginBottom: '0.75rem' }}>{box.personalized_pitch}</p>
                )}
                {box.match_reasons && box.match_reasons.length > 0 && (
                  <div>
                    {box.match_reasons.map((r, j) => (
                      <span key={j} style={{ display: 'inline-block', background: '#f3e8ff', color: '#7c3aed', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem', margin: '2px' }}>
                        ✓ {r}
                      </span>
                    ))}
                  </div>
                )}
                <button style={{
                  marginTop: '1rem', background: '#7c3aed', color: '#fff',
                  border: 'none', borderRadius: '8px', padding: '10px 20px',
                  cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem'
                }}>
                  Subscribe Now
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: '#9ca3af', padding: '2rem' }}>
            No recommendations available. Please try again.
          </div>
        )}

        <button
          onClick={() => { setResults(null); setCurrentStep(0); setAnswers({ preferences: [], lifestyle: '', allergies: '', budget: '', hobbies: '' }); }}
          style={{ marginTop: '1rem', background: 'transparent', color: '#6b7280', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '10px 20px', cursor: 'pointer', width: '100%' }}
        >
          Retake Quiz
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '600px', margin: '2rem auto', padding: '2rem', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {steps.map((s, i) => (
            <div key={i} style={{
              flex: 1, height: '4px', borderRadius: '2px',
              background: i <= currentStep ? '#7c3aed' : '#e5e7eb',
              transition: 'background 0.3s'
            }} />
          ))}
        </div>
        <div style={{ fontSize: '0.85rem', color: '#9ca3af', marginBottom: '0.5rem' }}>
          Step {currentStep + 1} of {steps.length}
        </div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>{step.title}</h1>
        <p style={{ color: '#6b7280' }}>{step.description}</p>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        {step.type === 'checkboxes' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            {step.options.map(opt => (
              <label key={opt} style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.75rem', border: `2px solid ${answers[step.field].includes(opt) ? '#7c3aed' : '#e5e7eb'}`,
                borderRadius: '8px', cursor: 'pointer',
                background: answers[step.field].includes(opt) ? '#faf5ff' : '#fff'
              }}>
                <input
                  type="checkbox"
                  checked={answers[step.field].includes(opt)}
                  onChange={() => handleAnswer(step.field, opt, 'checkboxes')}
                  style={{ display: 'none' }}
                />
                <span>{answers[step.field].includes(opt) ? '✓' : '○'}</span>
                <span style={{ fontSize: '0.9rem' }}>{opt}</span>
              </label>
            ))}
          </div>
        )}

        {step.type === 'radio' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {step.options.map(opt => (
              <label key={opt} style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.875rem 1rem', border: `2px solid ${answers[step.field] === opt ? '#7c3aed' : '#e5e7eb'}`,
                borderRadius: '8px', cursor: 'pointer',
                background: answers[step.field] === opt ? '#faf5ff' : '#fff'
              }}>
                <input
                  type="radio"
                  name={step.field}
                  value={opt}
                  checked={answers[step.field] === opt}
                  onChange={() => handleAnswer(step.field, opt, 'radio')}
                  style={{ display: 'none' }}
                />
                <span style={{
                  width: '18px', height: '18px', borderRadius: '50%',
                  border: `2px solid ${answers[step.field] === opt ? '#7c3aed' : '#d1d5db'}`,
                  background: answers[step.field] === opt ? '#7c3aed' : 'transparent',
                  flexShrink: 0
                }} />
                <span style={{ fontSize: '0.9rem' }}>{opt}</span>
              </label>
            ))}
          </div>
        )}

        {step.type === 'text' && (
          <input
            type="text"
            value={answers[step.field]}
            onChange={e => handleAnswer(step.field, e.target.value, 'text')}
            placeholder={step.placeholder}
            style={{
              width: '100%', padding: '12px 16px', border: '2px solid #e5e7eb',
              borderRadius: '8px', fontSize: '1rem', boxSizing: 'border-box',
              outline: 'none'
            }}
          />
        )}
      </div>

      {error && <div style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '0.9rem' }}>{error}</div>}

      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button
          onClick={() => setCurrentStep(s => Math.max(0, s - 1))}
          disabled={currentStep === 0}
          style={{
            background: 'transparent', color: currentStep === 0 ? '#d1d5db' : '#6b7280',
            border: '1px solid #e5e7eb', borderRadius: '8px', padding: '10px 20px',
            cursor: currentStep === 0 ? 'not-allowed' : 'pointer'
          }}
        >Back</button>
        <button
          onClick={next}
          disabled={loading}
          style={{
            background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '8px',
            padding: '10px 24px', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 600
          }}
        >
          {loading ? 'Finding matches...' : currentStep === steps.length - 1 ? 'Find My Boxes!' : 'Next →'}
        </button>
      </div>
    </div>
  );
}
