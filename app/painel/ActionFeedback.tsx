type ActionFeedbackProps = {
  message: string;
  tone?: "success" | "error";
};

export default function ActionFeedback({ message, tone = "success" }: ActionFeedbackProps) {
  if (!message) return null;

  return <p className={`management-action-feedback ${tone}`} role="status" aria-live="polite">{message}</p>;
}
