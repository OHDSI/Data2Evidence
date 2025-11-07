{{/* vim: set filetype=mustache: */}}
{{/*
Expand the name of the chart.
*/}}
{{- define "mri-pg-config-helm.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "mri-pg-config-helm.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- $name := default .Chart.Name .Values.nameOverride -}}
{{- if contains $name .Release.Name -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}
{{- end -}}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "mri-pg-config-helm.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Common labels
*/}}
{{- define "mri-pg-config-helm.labels" -}}
helm.sh/chart: {{ include "mri-pg-config-helm.chart" . }}
{{ include "mri-pg-config-helm.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
{{- if .Values.alpReleaseName }}
app.kubernetes.io/part-of: {{ .Values.alpReleaseName | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}

{{/*
Selector labels
*/}}
{{- define "mri-pg-config-helm.selectorLabels" -}}
app.kubernetes.io/name: {{ include "mri-pg-config-helm.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/part-of: {{ .Values.alpReleaseName | quote }}
{{- end -}}

{{/*
Create the name of the service account to use
*/}}
{{- define "mri-pg-config-helm.serviceAccountName" -}}
{{- if .Values.serviceAccount.create -}}
    {{ default (include "mri-pg-config-helm.fullname" .) .Values.serviceAccount.name }}
{{- else -}}
    {{ default "default" .Values.serviceAccount.name }}
{{- end -}}
{{- end -}}

{{/*
Define secret name Use existing or New one
*/}}
{{- define "mri-pg-config-helm.secret" -}}
{{- if .Values.dbK8sExistingSecretName -}}
    {{ .Values.dbK8sExistingSecretName }}
{{- else -}}
    {{ include "mri-pg-config-helm.fullname" . }}-secret
{{- end -}}
{{- end -}}
