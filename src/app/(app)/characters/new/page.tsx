import CharacterSheetFrame from "../[id]/CharacterSheetFrame";

export const metadata = {
  title: "New character — Starfall Academy",
};

// Opens the sheet in create mode: the Forge auto-opens, and the character row
// is only created when the build is committed (Begin).
export default function NewCharacterPage() {
  return <CharacterSheetFrame mode="create" id={null} />;
}
