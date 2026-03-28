import React from "react";
import Textarea from "../../components/ui/Textarea";

interface TipMessageInputProps {
  message: string;
  onChange: (msg: string) => void;
}

const TipMessageInput: React.FC<TipMessageInputProps> = ({ message, onChange }) => {
  return (
    <Textarea
      label="Message"
      placeholder="Leave a message... (optional)"
      maxLength={280}
      rows={3}
      value={message}
      onChange={(e) => onChange(e.target.value)}
    />
  );
};

export default TipMessageInput;
