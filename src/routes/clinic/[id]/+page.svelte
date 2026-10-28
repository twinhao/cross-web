<script lang="ts">
  import ClinicDetailView from "#lib/components/clinic-detail/ClinicDetailView.svelte";
  let { data } = $props();
</script>

<ClinicDetailView {data} />
