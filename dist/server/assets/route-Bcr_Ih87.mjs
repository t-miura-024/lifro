import { jsxs, jsx } from "react/jsx-runtime";
const SplitErrorComponent = ({
  error,
  reset
}) => /* @__PURE__ */ jsxs("div", { style: {
  padding: 32,
  maxWidth: 480,
  margin: "0 auto"
}, children: [
  /* @__PURE__ */ jsx("h1", { style: {
    fontSize: 18,
    fontWeight: 700
  }, children: "セッションの確認に失敗しました" }),
  /* @__PURE__ */ jsx("p", { style: {
    color: "#666",
    fontSize: 14
  }, children: "ネットワークやサーバの一時的な障害の可能性があります。再読み込みしても改善しない場合は時間をおいて試してください。" }),
  /* @__PURE__ */ jsx("pre", { style: {
    fontSize: 12,
    color: "#999",
    overflow: "auto"
  }, children: String(error?.message ?? error) }),
  /* @__PURE__ */ jsx("button", { type: "button", onClick: () => reset(), style: {
    minHeight: 48,
    padding: "0 24px"
  }, children: "再読み込みする" })
] });
export {
  SplitErrorComponent as errorComponent
};
