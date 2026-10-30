Feature: Finishing keeps to what is already stored

  Finishing saves a character under the build's id and then removes the build. It never overwrites
  a record it cannot read, and when the build cannot be removed it says so rather than going quiet.

  Scenario: A damaged record under the build's id is not overwritten
    Given a complete build with 0 freebie points remaining
    And the stored character record for the build is damaged
    When they try to finish the build
    Then they are told the saved character could not be read and the build has been kept
    And the build is still stored
    And the damaged record is still stored as it was

  Scenario: A build finished elsewhere that cannot be removed is reported
    Given a finished character whose build was not removed
    And the browser refuses to remove stored data
    When they continue the lingering build and finish it
    Then they are told the build was already finished but could not be removed
    And the build is still stored
