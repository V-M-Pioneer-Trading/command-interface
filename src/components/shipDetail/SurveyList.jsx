import { useCountdown } from "../../hooks/useCountdown";
import { formatCountdown } from "../../utils/spaceTraders";
import { PillButton } from "../common/PillButton";

function SurveyCard({ survey, disabled, onExtract }) {
  const remaining = useCountdown(survey.expiration);
  const expired = remaining <= 0;

  return (
    <li className={`lcars-survey-card ${expired ? "is-expired" : ""}`}>
      <div className="lcars-survey-card__deposits">
        {survey.deposits.map((d) => d.symbol).join(", ")}
      </div>
      <div className="lcars-survey-card__meta">
        <span>{survey.size}</span>
        <span>{expired ? "EXPIRED" : formatCountdown(remaining)}</span>
      </div>
      <PillButton
        accent="tan"
        disabled={disabled || expired}
        onClick={() => onExtract(survey)}
      >
        Extract
      </PillButton>
    </li>
  );
}

export function SurveyList({ surveys, disabled, onExtract }) {
  if (!surveys || surveys.length === 0) return null;

  return (
    <ul className="lcars-survey-list">
      {surveys.map((survey) => (
        <SurveyCard
          key={survey.signature}
          survey={survey}
          disabled={disabled}
          onExtract={onExtract}
        />
      ))}
    </ul>
  );
}
