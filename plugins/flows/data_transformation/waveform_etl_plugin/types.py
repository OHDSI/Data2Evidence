from enum import Enum
from typing import Optional
from pydantic import BaseModel, model_validator
import datetime as dt
from pathlib import Path
from dataclasses import dataclass, field


'''
Example for local development
{
  "options": {
    "filepath": "flows/waveform_etl_plugin/waveform_data",
    "schema_name": "waveform_cdm",
    "to_truncate": true,
    "database_code": "demo_database",
    "flow_action_type": "load_waveform_data",
    "vocab_schema_name": "cdmvocab",
    "waveform_occurrence_concept_id": "2081500025" -- Physiological measurement of electrocardiogram (ECG) waveform
  }
}
'''


class FlowActionType(str, Enum):
    LOAD_WAVEFORM_DATA = "load_waveform_data"
    LOAD_VOCAB = "load_vocab"


class WaveformETLOptions(BaseModel):
    flow_action_type: FlowActionType
    database_code: str
    cache_id: Optional[str] = None
    vocab_schema_name: str
    to_truncate: Optional[bool] = False

    # Required only when flow_action_type == LOAD_WAVEFORM_DATA
    schema_name: Optional[str] = None
    filepath: Optional[str] = None

    # User input purpose of the acquisition as this can't be extracted from files
    # (e.g., “ICU telemetry”, “12-lead diagnostic ECG”)
    # Required only when flow_action_type == LOAD_WAVEFORM_DATA
    waveform_occurrence_concept_id: Optional[str] = None

    @model_validator(mode="after")
    def check_waveform_data_fields(self) -> "WaveformETLOptions":
        if self.flow_action_type == FlowActionType.LOAD_WAVEFORM_DATA:
            missing = [
                name
                for name in ("schema_name", "filepath", "waveform_occurrence_concept_id")
                if getattr(self, name) is None
            ]
            if missing:
                raise ValueError(
                    f"{', '.join(missing)} required when flow_action_type is "
                    f"{FlowActionType.LOAD_WAVEFORM_DATA.value!r}"
                )
        return self


@dataclass
class ChannelSpec:
    name: str  # e.g. "II", "Pleth"
    file_name: str  # .dat file this channel's samples live in
    units: str  # e.g. "mV", "NU", "Ohm"
    sample_rate: float  # per-channel Hz: segment fs * samps_per_frame
    gain: float  # WFDB ADC gain (counts per `units`)


@dataclass
class SegmentInfo:
    name: str
    n_samples: int
    start_offset_samples: int  # cumulative samples before this segment
    channels: list[ChannelSpec] = field(default_factory=list)

    @property
    def files(self) -> list[str]:
        # Distinct .dat files this segment references, in first-seen order
        # (a .dat file commonly carries several multiplexed channels).
        seen: set[str] = set()
        ordered: list[str] = []
        for ch in self.channels:
            if ch.file_name not in seen:
                seen.add(ch.file_name)
                ordered.append(ch.file_name)
        return ordered


@dataclass
class RecordRef:
    subject_dir: Path  # e.g. .../waves/p100/p10014354
    record_dir: Path  # e.g. .../waves/p100/p10014354/81739927
    record_name: str  # e.g. "81739927"

    @property
    def header_path(self) -> Path:
        return self.record_dir / self.record_name

    @property
    def group_id(self) -> str:
        # e.g. "p100/p10014354/81739927/81739927" - unique per record, used
        # downstream to group this record's files into one session.
        return f"{self.subject_dir.parent.name}/{self.subject_dir.name}/{self.record_name}/{self.record_name}"

@dataclass
class RecordInfo:
    ref: RecordRef
    subject_id: str
    hadm_id: str | None
    fs: float
    total_samples: int
    start_datetime: dt.datetime
    segments: list[SegmentInfo]

    @property
    def end_datetime(self) -> dt.datetime:
        return self.start_datetime + dt.timedelta(seconds=self.total_samples / self.fs)