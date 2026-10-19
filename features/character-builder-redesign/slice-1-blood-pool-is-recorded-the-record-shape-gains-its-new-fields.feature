Feature: Starting Blood Pool is recorded by the player

  Background:
    Given I am building a character at 13th generation

  Scenario: A new build has no Blood Pool recorded
    When I open Finishing touches
    Then the Blood Pool field reads "Not recorded"
    And it is tagged "Required"
    And the hint reads "0 to 10 at 13th generation"

  Scenario: Recording a Blood Pool
    When I record a starting Blood Pool of 10
    Then the Blood Pool is no longer tagged "Required"
    And after reloading the builder it still reads 10

  Scenario: Zero is a recorded value that survives a reload
    When I record a starting Blood Pool of 0
    And I reload the builder
    Then the Blood Pool field reads 0 and is not tagged "Required"

  Scenario Outline: An invalid Blood Pool is refused and the entry is kept beside the message
    When I record a starting Blood Pool of "<entry>"
    Then the field is marked invalid and the message "The Blood Pool must be a whole number from 0 to 10." is announced politely
    And the field still shows "<entry>"
    And after reloading the builder the Blood Pool still reads "Not recorded"

    Examples:
      | entry |
      | 11    |
      | -1    |
      | 2.5   |
      | 10.0  |
      | +5    |
      | 1e1   |
      | ten   |

  Scenario: Clearing the field returns to Not recorded
    Given I have recorded a starting Blood Pool of 10
    When I clear the Blood Pool field
    Then the Blood Pool field reads "Not recorded" and is tagged "Required"

  Scenario Outline: The range follows the effective generation
    Given a build at base <base> generation with <dots> dots of the Generation Background
    When I record a starting Blood Pool of <entry>
    Then I am told the Blood Pool must be a whole number from 0 to <max>

    Examples:
      | base | dots | entry | max |
      | 4th  | 0    | 51    | 50  |
      | 6th  | 2    | 51    | 50  |
      | 13th | 1    | 12    | 11  |

  Scenario: An unrecorded Blood Pool blocks finishing
    Given a clan is chosen and every creation dot is placed
    Then the outstanding list includes "Record a starting Blood Pool"
    And Finish is aria-disabled, still focusable, and explains "Finish character · 1 item left"
    And activating Finish does nothing
    When I record a starting Blood Pool of 10
    Then the outstanding list is empty and Finish is enabled

  Scenario: A build saved before this change reads Blood Pool 0 as Not recorded
    Given a build saved before this change with a Blood Pool of 0
    When I open it in the builder
    Then the Blood Pool field reads "Not recorded"

  Scenario: A build saved before this change keeps a non-zero Blood Pool
    Given a build saved before this change with a Blood Pool of 7
    When I open it in the builder
    Then the Blood Pool field reads 7

  Scenario: Recording 0 on a pre-change build survives a reload
    Given a build saved before this change with a Blood Pool of 0
    When I open it in the builder and record a starting Blood Pool of 0
    And I reload the builder
    Then the Blood Pool field reads 0 and is not tagged "Required"

  Scenario Outline: Whitespace around a Blood Pool entry
    When I record a starting Blood Pool of "<entry>"
    Then the Blood Pool field reads "<result>"

    Examples:
      | entry  | result       |
      | " 10 " | 10           |
      | "010"  | 10           |
      | "  "   | Not recorded |

  Scenario: A new record with a malformed Blood Pool is unreadable
    Given a stored new-shape build whose Blood Pool is "ten"
    When I open it in the builder
    Then I am told the build could not be read
    And the stored record is unchanged

  Scenario: A pre-change build can be finished once its Blood Pool is recorded
    Given a build saved before this change with a Blood Pool of 7 and everything else placed
    When I open it, then finish it
    Then the character's sheet shows a blood pool of 7

  Scenario: A recorded zero reaches the sheet as zero
    Given a finishable build with a recorded Blood Pool of 0
    When I finish the build
    Then the character's sheet shows a blood pool of 0

  Scenario: A refusal is perceivable without colour
    When I record a starting Blood Pool of 11
    Then axe reports no violations with the refusal shown
    And the refusal is stated in text

  Scenario: The recorded Blood Pool reaches the finished character
    Given a finishable build with a recorded Blood Pool of 9
    When I finish the build
    Then the character's sheet shows a blood pool of 9
