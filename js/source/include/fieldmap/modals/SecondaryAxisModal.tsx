import React, { useEffect, useState } from 'react';
import { useModals } from '../contexts/ModalsContext';
import { useLayoutConfig } from '../contexts/LayoutConfigContext';

interface SecondaryAxisModalProps {
}

export const SecondaryAxisModal: React.FC<SecondaryAxisModalProps> = ({}) => {
    const {
        showSecondaryAxisModal: show,
        setShowSecondaryAxisModal: setShow,
    } = useModals();

    const {
        secondaryAxis, setSecondaryAxis,
    } = useLayoutConfig();

    const [secondaryXAxisLabel, setSecondaryXAxisLabel] = useState(secondaryAxis?.xLabel || '');
    const [secondaryYAxisLabel, setSecondaryYAxisLabel] = useState(secondaryAxis?.yLabel || '');
    const [secondaryXAxisValues, setSecondaryXAxisValues] = useState(secondaryAxis?.xValues?.join(',') || '');
    const [secondaryYAxisValues, setSecondaryYAxisValues] = useState(secondaryAxis?.yValues?.join(',') || '');

    useEffect(() => {
        if (show) {
            setSecondaryXAxisLabel(secondaryAxis?.xLabel || '');
            setSecondaryYAxisLabel(secondaryAxis?.yLabel || '');
            setSecondaryXAxisValues(secondaryAxis?.xValues?.join(',') || '');
            setSecondaryYAxisValues(secondaryAxis?.yValues?.join(',') || '');
        }
    }, [show, secondaryAxis]);

    const handleApply = async () => {
        const toValueArray = (str: string) => str.split(',')
            .map(v => v.trim())
            .filter(v => v !== '');

        const xValues = toValueArray(secondaryXAxisValues);
        const yValues = toValueArray(secondaryYAxisValues);

        if (secondaryXAxisLabel || secondaryYAxisLabel || xValues.length > 0 || yValues.length > 0) {
            setSecondaryAxis({
                xLabel: secondaryXAxisLabel,
                yLabel: secondaryYAxisLabel,
                xValues,
                yValues
            });
        } else {
            setSecondaryAxis(undefined);
        }
        setShow(false);
    };

    if (!show) return null;

    return (
        <div className="modal show tw:block tw:bg-black/50">
            <div className="modal-dialog">
                <div className="modal-content">
                    <div className="modal-header">
                        <button type="button" className="close" onClick={() => setShow(false)}>&times;</button>
                        <h4 className="modal-title">Change Secondary Axis</h4>
                    </div>
                    <div className="modal-body">
                        <div className="form-group">
                            <label>Secondary X Axis Label:</label>
                            <input type="text" className="form-control" value={secondaryXAxisLabel} onChange={e => setSecondaryXAxisLabel(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label>Secondary X Axis Values (comma-separated):</label>
                            <input type="text" className="form-control" value={secondaryXAxisValues} onChange={e => setSecondaryXAxisValues(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label>Secondary Y Axis Label:</label>
                            <input type="text" className="form-control" value={secondaryYAxisLabel} onChange={e => setSecondaryYAxisLabel(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label>Secondary Y Axis Values (comma-separated):</label>
                            <input type="text" className="form-control" value={secondaryYAxisValues} onChange={e => setSecondaryYAxisValues(e.target.value)} />
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button className="btn btn-default" onClick={() => setShow(false)}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleApply}>Apply</button>
                    </div>
                </div>
            </div>
        </div>
    );
};
