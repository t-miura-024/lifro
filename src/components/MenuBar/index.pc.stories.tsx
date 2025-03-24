import type { Meta, StoryFn } from "@storybook/react";
import { MenuBarPC } from ".";

export default {
  title: "Components/MenuBarPC",
  component: MenuBarPC,
} as Meta;

const Template: StoryFn = (args) => <MenuBarPC {...args} />;

export const Default = Template.bind({});
Default.args = {};
Default.parameters = {};
