import React from 'react';
import AIReport from './AIReport';

export default function AIResultDisplay({ result, featureName }) {
  return <AIReport response={result} title={featureName || 'AI Result'} />;
}
