Feature: The Nature & Demeanor screen

  Background:
    Given I am on the Nature & Demeanor screen of a new build

  Scenario: Both roles start empty
    Then the Nature and Demeanor cards read "Not chosen"
    And the role switch has Nature active
    And the role switch offers "Assign as Nature" and "Assign as Demeanor"

  Scenario: Assigning a Nature and a Demeanor
    When I assign Visionary as Nature
    And I switch to Demeanor and choose Bon Vivant
    Then the Nature card reads Visionary and the Demeanor card reads Bon Vivant
    And the Nature / Demeanor readout reads "Visionary / Bon Vivant"
    And after reloading the builder the Nature card reads Visionary and the Demeanor card reads Bon Vivant

  Scenario: The same archetype may fill both roles
    When I assign Visionary as Nature
    And I switch to Demeanor and choose Visionary
    Then both cards read Visionary

  Scenario: Archetypes are marked with the roles they fill
    When I assign Visionary as Nature
    And I switch to Demeanor and choose Bon Vivant
    Then Visionary is marked "N" and Bon Vivant is marked "D"
    And Thrill-Seeker has no mark

  Scenario: An archetype filling both roles is marked N and D
    When I assign Visionary as Nature
    And I switch to Demeanor and choose Visionary
    Then Visionary is marked "N D"

  Scenario: The archetype held by the active role reads Selected
    Given Visionary is assigned as Nature
    Then Visionary reads "Selected" while Nature is active
    When I switch to Demeanor
    Then Visionary does not read "Selected"

  Scenario: Assigning is announced
    When I assign Visionary as Nature
    Then the assignment "Visionary assigned as Nature." is announced

  Scenario: Choosing the assigned archetype again keeps it
    Given Visionary is assigned as Nature
    When I choose Visionary again with Nature active
    Then the Nature card reads Visionary

  Scenario: Emptying my own archetype clears that role
    Given Visionary is assigned as Nature
    When I empty my own archetype with Nature active
    Then the Nature card reads "Not chosen"
    And Visionary has no mark

  Scenario: Searching the catalogue
    When I search the archetypes for "thr"
    Then only the archetype Thrill-Seeker is listed
    And the archetype count heading reads "All Archetypes · 1"
    And the archetype result count "1 archetype listed" is announced

  Scenario: A search with no match
    When I search the archetypes for "zzz"
    Then no archetypes are listed
    And I am told no archetype matches and it is announced

  Scenario: Writing my own archetype goes to the active role
    Given Demeanor is the active role
    When I enter "Wanderer" as my own archetype
    Then the Demeanor card reads Wanderer and the Nature card is unchanged
    And after reloading the builder it is unchanged

  Scenario: No archetype is required
    Then Continue is enabled
    And the sidebar marks Nature & Demeanor "Optional"

  Scenario: No archetype description is shown
    Then no archetype shows a description line

  Scenario: The keys are named beside the controls
    Then the role switch and the archetype list are described as arrow keys switch role, Tab moves between archetypes, Space or Enter assigns

  Scenario Outline: The search shortcut on each platform
    Given the platform is "<platform>"
    And I am on the Nature & Demeanor screen
    When I press <keys>
    Then focus is in the archetype search field
    And the archetype search hint reads "<hint>"

    Examples:
      | platform | keys      | hint   |
      | macOS    | Meta+K    | ⌘K     |
      | other    | Control+K | Ctrl K |

  Scenario: Screen standards
    When I choose Character concept in the sidebar and then Nature & Demeanor
    Then focus is on the Nature & Demeanor heading
    And there is exactly one h1
    And axe reports no violations at 1512 px and 375 px
    And every control has a unique accessible name
    And the page does not scroll horizontally at 375 px
    And the page does not scroll horizontally at 320 px

  Scenario: Screen standards with both roles assigned and a search shown
    When I assign Visionary as Nature
    And I switch to Demeanor and choose Bon Vivant
    And I search the archetypes for "i"
    Then axe reports no violations at 1512 px and 375 px
    And every control has a unique accessible name
    And the page does not scroll horizontally at 375 px
    And the page does not scroll horizontally at 320 px
