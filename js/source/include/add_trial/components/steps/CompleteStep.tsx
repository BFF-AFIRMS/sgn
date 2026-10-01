import React from 'react';
import { useDesignResult } from '../../contexts/DesignResultContext';

export const CompleteStep: React.FC = () => {
    const { savedTrialId } = useDesignResult();

    const handleComplete = () => {
        window.location.href = '/breeders/trials';
    };

    return (
        <div className="workflow-complete-message workflow-message-show">
            <div id="pagetitle">
                <h3>Complete! Your trial was saved in the database.</h3>
            </div>
            <p>
                <span className="glyphicon glyphicon-ok-sign tw:text-green-600 tw:text-xl tw:mr-2"></span>
                The trial was saved successfully
            </p>
            <ul className="tw:list-disc tw:pl-6 tw:space-y-1.5 tw:my-4">
                <li>You may want to proceed to the trial detail page for the trial you just created.</li>
                <li>You can print barcodes for the plots or plants or tissue samples in this trial.</li>
                <li>You can add phenotypes for the plots or plants in this trial now.</li>
            </ul>
            <br />
            <div className="tw:flex tw:justify-center tw:gap-3">
                <button
                    type="button"
                    id="create_trial_success_complete_button"
                    name="create_trial_success_complete_button"
                    className="btn btn-primary"
                    onClick={handleComplete}
                >
                    The trial was saved to the database with no errors! Click here to view trial
                </button>
                {savedTrialId && (
                    <a
                        id="view_created_trial_link"
                        href={`/breeders/trial/${savedTrialId}`}
                        className="btn btn-default"
                    >
                        View Trial Page
                    </a>
                )}
                <a href="/breeders/trials" className="btn btn-default">
                    Browse All Trials
                </a>
            </div>
        </div>
    );
};
