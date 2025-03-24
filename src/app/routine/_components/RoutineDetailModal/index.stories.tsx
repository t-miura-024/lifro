import React from 'react';
import { RoutineDetailModal } from './index';

export default {
  title: 'app/routine/RoutineDetailModal',
  component: RoutineDetailModal,
};

const sampleRoutine = {
  name: '上半身ルーティン',
  description: '上半身を鍛えるためのルーティンです。',
  exercises: ['ベンチプレス', 'ラットプルダウン', 'ショルダープレス'],
};

export const Default = () => <RoutineDetailModal routine={sampleRoutine} />; 