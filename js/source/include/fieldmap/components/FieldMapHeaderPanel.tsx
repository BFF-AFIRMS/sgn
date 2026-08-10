import React from 'react';
import { useView } from '../contexts/ViewContext';
import { useHeatmap } from '../contexts/HeatmapContext';
import { useDataFetch } from '../contexts/DataFetchContext';

interface FieldMapHeaderPanelProps { }

export const FieldMapHeaderPanel: React.FC<FieldMapHeaderPanelProps> = ({
}) => {
    const {
        selectedView, setSelectedView,
        setSelectedViewLabel,
        displayLinkedTrials,
        linkedTrialsList,
    } = useView();

    const {
        setHeatmapData,
        variables,
        spatialAdjustments,
    } = useHeatmap();

    const {
        fetchHeatmapObservations,
        toggleLinkedTrials
    } = useDataFetch();

    const handleViewChange = (val: string) => {
        setSelectedView(val);
        if (val === 'fieldmap' || val === 'geofieldmap') {
            setHeatmapData({});
        } else if (val) {
            const variableId = val.replace(' (corrected)', '').replace(' (adjustment)', '');
            fetchHeatmapObservations(variableId);
        }
    };

    return (
        <div className="panel panel-default">
            <div className="panel-body">
                <div className="tw:flex tw:gap-6.25 tw:flex-wrap tw:items-center">
                    <div className="form-group tw:m-0 tw:min-w-50">
                        <label className="tw:mr-2.5">Select Layout View:</label>
                        <select
                            className="form-control"
                            value={selectedView}
                            onChange={e => {
                                setSelectedViewLabel(e.target.options[e.target.selectedIndex]?.text || '');
                                handleViewChange(e.target.value);
                            }}
                        >
                            <optgroup label="Field Map">
                                <option value="fieldmap">View Field Layout</option>
                                <option value="geofieldmap">View Geo Field Layout</option>
                            </optgroup>
                            <optgroup label="Assayed Traits">
                                {Object.keys(variables).sort().map(name => (
                                    <option key={variables[name]} value={variables[name]}>{name}</option>
                                ))}
                            </optgroup>
                            {Object.keys(spatialAdjustments).length > 0 && (
                                <optgroup label="Spatial Corrections">
                                    {Object.keys(variables).sort().map(name => {
                                        const id = variables[name];
                                        return (
                                            <React.Fragment key={id}>
                                                <option value={`${id} (corrected)`}>{name} (corrected)</option>
                                                <option value={`${id} (adjustment)`}>{name} (adjustment)</option>
                                            </React.Fragment>
                                        );
                                    })}
                                </optgroup>
                            )}
                        </select>
                    </div>

                    <div className="form-check tw:m-0">
                        <label className="form-check-label">
                            <input
                                type="checkbox"
                                className="form-check-input tw:mr-1.25"
                                checked={displayLinkedTrials}
                                onChange={e => toggleLinkedTrials(e.target.checked)}
                            />
                            Display Trials in Same Field
                        </label>
                    </div>
                </div>

                {displayLinkedTrials && linkedTrialsList.length > 0 && (
                    <div className="tw:mt-2.5 tw:p-2.5 tw:bg-[#f9f9f9] tw:rounded-lg">
                        <strong>Trials in Same Field:</strong>
                        <div className="tw:flex tw:gap-2.5 tw:flex-wrap tw:mt-1.25">
                            {linkedTrialsList.map(t => (
                                <span key={t.id} style={{ background: t.bg, color: t.fg }} className="tw:px-2 tw:py-0.75 tw:rounded-lg tw:text-[12px]">
                                    {t.name}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
