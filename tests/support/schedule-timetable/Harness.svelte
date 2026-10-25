<script>
  import "./harness.css";
  import ScheduleTimetable from "#lib/components/clinic-detail/ScheduleTimetable.svelte";
  const entry = { date: "2030-03-04", weekday: 0, doctor_id: "fixture", doctor_name: "虛構治療師", department: "", session: "afternoon" };
  const continuous = { ...entry, start_time: "13:00", end_time: "21:00" };
  const schedule = { week_start: "2030-03-04", week_end: "2030-03-10", week_offset: 0, entries: [continuous, continuous,
    { ...entry, date: "2030-03-05", weekday: 1, session: "morning", start_time: "09:00", end_time: "11:00" },
    { ...entry, date: "2030-03-05", weekday: 1, session: "morning", start_time: "11:30", end_time: "14:00" }] };
</script>
<main class="mx-auto max-w-6xl p-4"><ScheduleTimetable {schedule}/></main>
