import React from 'react';
import { useWizard } from '../../contexts/WizardContext';

export const IntroStep: React.FC = () => {
    const { setCurrentStep, markStepComplete } = useWizard();

    const handleNext = () => {
        markStepComplete(0);
        setCurrentStep(1);
    };

    return (
        <div className="tw:p-4">
            <div className="page_title tw:mb-4">
                <h3 className="tw:font-bold tw:text-lg">This workflow will guide you through designing a new trial in the database</h3>
            </div>
            <p>
                A field trial represents a field where each plot has a globally unique plot name, a sequential plot number, and an accession representing the genotype tested in that plot.
            </p>
            <p>
                To design a trial you need to provide a globally unique trial name. The plot names will be generated based on the trial name you provide (e.g. if the trial name is 2018MyTrial, plot_names will be generated like 2018MyTrial_101, 2018MyTrial_102, etc).
            </p>
            <p>
                Based on the design you choose (e.g. Complete Block, Alpha Lattice, p-rep, Split Plot), accessions or crosses will be randomized over blocks and replicates.
            </p>
            <p>
                You can provide a list of accessions to use as controls or checks in your experiment.
            </p>
            <p>
                Depending on the design you have picked, you will need to provide different design parameters (e.g. for complete block you will need to provide number of blocks, while for alpha lattice you will need to provide block size and number of replicates).
            </p>
            <p>
                A trial can represent a yield trial, a phenotyping trial, a crossing block, a greenhouse, a nursery, etc.
            </p>
            <p>
                A plot can have many plants, which the database can track as separate entities, allowing you to record plant level observations and information.
            </p>
            <br /><br />
            <div className="tw:flex tw:justify-center">
                <button
                    type="button"
                    id="next_step_intro_button"
                    className="btn btn-primary"
                    onClick={handleNext}
                >
                    Go to Next Step
                </button>
            </div>
        </div>
    );
};
