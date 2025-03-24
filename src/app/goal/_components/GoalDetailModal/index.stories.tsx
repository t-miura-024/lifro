import React from 'react';
import { GoalDetailModal, type GoalDetailModalProps } from './index';

export default {
  title: 'app/goal/GoalDetailModal',
  component: GoalDetailModal,
};

const Template = (args: GoalDetailModalProps) => <GoalDetailModal {...args} />;

export const Default = {
  args: {
    goal: {
      title: 'ベンチプレス100kg',
      target: '100kg',
      progress: 80,
      current: 80,
    },
  },
};
