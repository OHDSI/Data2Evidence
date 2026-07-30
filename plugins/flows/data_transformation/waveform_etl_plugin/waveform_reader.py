import wfdb
from pathlib import Path

import datetime as dt


from .types import RecordInfo, RecordRef, SegmentInfo, ChannelSpec


def _discover_records(waves_root: Path) -> list[RecordRef]:
    records: list[RecordRef] = []
    for records_file in sorted(waves_root.glob("*/*/RECORDS")):
        subject_dir = records_file.parent
        for line in records_file.read_text().splitlines():
            line = line.strip()
            if not line:
                continue
            record_dir_name, record_name = line.rstrip("/").split("/")
            record_dir = subject_dir / record_dir_name
            if not (record_dir / f"{record_name}.hea").exists():
                raise FileNotFoundError(f"Missing header file for {record_name} in {record_dir}")
            records.append(RecordRef(subject_dir, record_dir, record_name))
    return records


def get_next_record_ids(schema: str, table_id: dict[str, str], dbdao) -> dict[str, int]:
    """
    Returns a dictionary of the next record IDs for the specified tables.
    """
    last_ids = {}
    for table, id_column in table_id.items():
        last_id = dbdao.get_next_record_id(schema, table, id_column)
        last_ids[table] = last_id
    return last_ids


def _parse_comments(comments: list[str]) -> dict[str, str]:
    """Simple parser for WFDB comments, which are just lines of text. Returns a dict of key-value pairs."""
    parsed = {}
    for c in comments:
        parts = c.split(maxsplit=1)
        if len(parts) == 2:
            parsed[parts[0]] = parts[1]
    return parsed


def parse_record(ref: RecordRef) -> RecordInfo:
    """Reads the master header of a WFDB record and every segment header, returning a RecordInfo object with its metadata."""
    master = wfdb.rdheader(str(ref.header_path), rd_segments=True)

    comments = _parse_comments(master.comments)
    subject_id = comments.get("subject_id", ref.subject_dir.name.lstrip("p"))
    hadm_id = comments.get("hadm_id")

    if master.base_date is None or master.base_time is None:
        raise ValueError(f"{ref.record_name}: missing base_date/base_time, cannot anchor timestamps")
    start_datetime = dt.datetime.combine(master.base_date, master.base_time)

    segments: list[SegmentInfo] = []
    offset = 0
    for seg_name, seg_len in zip(master.seg_name, master.seg_len):
        channels: list[ChannelSpec] = []
        if seg_name != "~" and seg_len > 0:
            seg_header = wfdb.rdheader(str(ref.record_dir / seg_name))
            samps_per_frame = seg_header.samps_per_frame or [1] * seg_header.n_sig
            for i in range(seg_header.n_sig):
                channels.append(
                    ChannelSpec(
                        name=seg_header.sig_name[i],
                        file_name=seg_header.file_name[i],
                        units=seg_header.units[i],
                        sample_rate=seg_header.fs * (samps_per_frame[i] or 1),
                        gain=seg_header.adc_gain[i],
                    )
                )
        segments.append(SegmentInfo(seg_name, seg_len, offset, channels))
        offset += seg_len

    return RecordInfo(
        ref=ref,
        subject_id=subject_id,
        hadm_id=hadm_id,
        fs=master.fs,
        total_samples=master.sig_len,
        start_datetime=start_datetime,
        segments=segments,
    )
