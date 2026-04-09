import { useNavigate, useSearchParams } from "react-router";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

/**
 * Sentinel value used inside the radix Select for the "All instructors" item.
 *
 * Radix Select can't have an item whose value is the empty string, and we
 * want a value distinct from any real instructor id. We translate to/from
 * this sentinel at the picker boundary so the URL stays clean: the
 * platform-wide view is `/instructor/analytics` (no `instructorId` param at
 * all), not `/instructor/analytics?instructorId=all`.
 */
const ALL_INSTRUCTORS_VALUE = "__all__";

type InstructorOption = {
  id: number;
  name: string;
};

type InstructorPickerProps = {
  /** Every instructor on the platform, alphabetized by name. */
  instructors: InstructorOption[];
  /**
   * The instructor currently being viewed, or `null` for the platform-wide
   * "All instructors" view. The picker reflects this in its trigger label.
   */
  selectedInstructorId: number | null;
};

/**
 * Admin-only dropdown at the top of the analytics overview that scopes the
 * page to a single instructor or to "All instructors" (platform-wide).
 *
 * The selection is persisted in the URL as `?instructorId=N` (or no param
 * for All). On change we navigate to the new URL, which triggers React
 * Router to re-run the loader with the new scope. No client-side state.
 *
 * The route loader is responsible for rendering this only when the viewer
 * is an admin — the picker itself does not check the role.
 */
export function InstructorPicker({
  instructors,
  selectedInstructorId,
}: InstructorPickerProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  function handleValueChange(value: string) {
    const nextSearchParams = new URLSearchParams(searchParams);

    if (value === ALL_INSTRUCTORS_VALUE) {
      nextSearchParams.delete("instructorId");
    } else {
      nextSearchParams.set("instructorId", value);
    }

    const nextSearch = nextSearchParams.toString();
    navigate(
      nextSearch
        ? `/instructor/analytics?${nextSearch}`
        : "/instructor/analytics",
    );
  }

  const currentValue =
    selectedInstructorId === null
      ? ALL_INSTRUCTORS_VALUE
      : String(selectedInstructorId);

  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor="instructor-picker"
        className="text-sm font-medium text-muted-foreground"
      >
        Instructor
      </label>
      <Select value={currentValue} onValueChange={handleValueChange}>
        <SelectTrigger id="instructor-picker" className="min-w-[12rem]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_INSTRUCTORS_VALUE}>All instructors</SelectItem>
          {instructors.map((instructor) => (
            <SelectItem key={instructor.id} value={String(instructor.id)}>
              {instructor.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
