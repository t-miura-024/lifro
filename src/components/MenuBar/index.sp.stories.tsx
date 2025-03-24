import type { Meta, StoryFn } from "@storybook/react";
import { MenuBarSP } from ".";

export default {
  title: "Components/MenuBarSP",
  component: MenuBarSP,
} as Meta;

const Template: StoryFn = (args) => <MenuBarSP {...args} />;

export const Default = Template.bind({});
Default.args = {};
Default.parameters = {};
