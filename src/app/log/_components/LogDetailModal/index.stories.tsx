import React from 'react';
import { LogDetailModal } from './index';

export default {
  title: 'app/log/LogDetailModal',
  component: LogDetailModal,
};

const sampleLog = {
  id: 1,
  date: new Date(),
  exercises: [
    { name: 'ベンチプレス', sets: [{ weight: 80, reps: 8 }] },
  ],
  totalVolume: 640,
};

export const Default = () => <LogDetailModal log={sampleLog} />; 