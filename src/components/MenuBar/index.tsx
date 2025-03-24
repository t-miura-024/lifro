import Link from "next/link";
import { useRouter } from "next/router";
import { ClipboardList, BarChart, Settings, Target, RefreshCw } from "lucide-react";

const LINKS = {
  LOG: "/log",
  STATISTICS: "/statistics",
  SETTINGS: "/settings",
  GOAL: "/goal",
  ROUTINE: "/routine",
};

export const MenuBarPC: React.FC = () => {
  const iconStyle = { width: 32, height: 32 };
  const liStyle = { display: "flex", alignItems: "center", justifyContent: "center", width: "100%", borderRadius: "5px" };
  const linkStyle = { padding: "20px 0" };

  const router = useRouter();
  const currentPath = router.pathname;

  return (
    <div style={{ position: "fixed", left: 0, top: 0, height: "100%", overflowY: "auto", width: "75px" }}>
      <ul>
        <li style={liStyle}>
          <Link href={LINKS.LOG} style={linkStyle}>
            <ClipboardList style={iconStyle} color={currentPath === LINKS.LOG ? "blue" : "black"} />
          </Link>
        </li>
        <li style={liStyle}>
          <Link href={LINKS.STATISTICS} style={linkStyle}>
            <BarChart style={iconStyle} color={currentPath === LINKS.STATISTICS ? "blue" : "black"} />
          </Link>
        </li>
        <li style={liStyle}>
          <Link href={LINKS.SETTINGS} style={linkStyle}>
            <Settings style={iconStyle} color={currentPath === LINKS.SETTINGS ? "blue" : "black"} />
          </Link>
        </li>
        <li style={liStyle}>
          <Link href={LINKS.GOAL} style={linkStyle}>
            <Target style={iconStyle} color={currentPath === LINKS.GOAL ? "blue" : "black"} />
          </Link>
        </li>
        <li style={liStyle}>
          <Link href={LINKS.ROUTINE} style={linkStyle}>
            <RefreshCw style={iconStyle} color={currentPath === LINKS.ROUTINE ? "blue" : "black"} />
          </Link>
        </li>
      </ul>
    </div>
  );
};

export const MenuBarSP: React.FC = () => {
  const iconStyle = { width: 32, height: 32 };
  const liStyle = { display: "flex", alignItems: "center", justifyContent: "center", width: "100%", borderRadius: "5px" };
  const linkStyle = { padding: "20px" };

  const router = useRouter();
  const currentPath = router.pathname;

  return (
    <div style={{ position: "fixed", bottom: 0, width: "100%", overflowX: "auto", height: "75px" }}>
      <ul style={{ display: "flex", flexDirection: "row", justifyContent: "space-around" }}>
        <li style={liStyle}>
          <Link href={LINKS.LOG} style={linkStyle}>
            <ClipboardList style={iconStyle} color={currentPath === LINKS.LOG ? "blue" : "black"} />
          </Link>
        </li>
        <li style={liStyle}>
          <Link href={LINKS.STATISTICS} style={linkStyle}>
            <BarChart style={iconStyle} color={currentPath === LINKS.STATISTICS ? "blue" : "black"} />
          </Link>
        </li>
        <li style={liStyle}>
          <Link href={LINKS.SETTINGS} style={linkStyle}>
            <Settings style={iconStyle} color={currentPath === LINKS.SETTINGS ? "blue" : "black"} />
          </Link>
        </li>
        <li style={liStyle}>
          <Link href={LINKS.GOAL} style={linkStyle}>
            <Target style={iconStyle} color={currentPath === LINKS.GOAL ? "blue" : "black"} />
          </Link>
        </li>
        <li style={liStyle}>
          <Link href={LINKS.ROUTINE} style={linkStyle}>
            <RefreshCw style={iconStyle} color={currentPath === LINKS.ROUTINE ? "blue" : "black"} />
          </Link>
        </li>
      </ul>
    </div>
  );
};
