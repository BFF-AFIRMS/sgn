import React from 'react';
import { Plot } from '../types';

interface FieldMapControlPanelProps {
    selectedView: string;
    showControlsSection: boolean;
    setShowControlsSection: (val: boolean) => void;
    selectedControlPlot: string;
    setSelectedControlPlot: (val: string) => void;
    controlRelationshipText: string;
    setControlRelationshipText: (val: string) => void;
    controlPlots: Plot[];
    plotList: Plot[];
}

export const FieldMapControlPanel: React.FC<FieldMapControlPanelProps> = ({
    selectedView,
    showControlsSection,
    setShowControlsSection,
    selectedControlPlot,
    setSelectedControlPlot,
    controlRelationshipText,
    setControlRelationshipText,
    controlPlots,
    plotList
}) => {
    if (selectedView === 'fieldmap' || selectedView === 'geofieldmap') {
        return null;
    }

    return (
        <div className="panel panel-default">
            <div className="panel-body tw:flex tw:gap-3.75 tw:items-center tw:flex-wrap">
                {!showControlsSection ? (
                    <button className="btn btn-primary btn-sm" onClick={() => setShowControlsSection(true)}>View Controls</button>
                ) : (
                    <div className="tw:flex tw:gap-2.5 tw:items-center tw:flex-wrap">
                        <select
                            className="form-control"
                            value={selectedControlPlot}
                            onChange={e => {
                                const val = e.target.value;
                                setSelectedControlPlot(val);
                                if (val) {
                                    const p = plotList.find(plot => plot.observationUnitDbId === val);
                                    if (p) {
                                        setControlRelationshipText(`Plot: ${p.observationUnitName} contains Check: ${p.germplasmName || ''}`);
                                    }
                                } else {
                                    setControlRelationshipText('');
                                }
                            }}
                        >
                            <option value="">checks and plot numbers</option>
                            {controlPlots.map(cp => (
                                <option key={cp.observationUnitDbId} value={cp.observationUnitDbId}>
                                    Plot:{cp.observationUnitName} [{cp.germplasmName}]
                                </option>
                            ))}
                        </select>
                        {controlRelationshipText && (
                            <span className="text-sm font-semibold bg-[#fcf8e3] p-1 border rounded">{controlRelationshipText}</span>
                        )}
                        <button className="btn btn-default btn-xs" onClick={() => { setShowControlsSection(false); setSelectedControlPlot(''); setControlRelationshipText(''); }}>Hide</button>
                    </div>
                )}
            </div>
        </div>
    );
};
