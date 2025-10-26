import { Text } from "@react-pdf/renderer";
import { defaultTemplateStyles } from "../styles";

export const DefaultTemplateFooter = () => {
  return <Text style={defaultTemplateStyles.footer}>-</Text>;
};
