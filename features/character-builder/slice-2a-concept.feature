Feature: Character concept details

  Scenario: Concept details are kept
    Given a player who has started building a character
    When they enter the concept details
      | field     | text            |
      | Name      | Lucita          |
      | Player    | Ana             |
      | Chronicle | Madrid by Night |
      | Concept   | Fallen noble    |
      | Sire      | Moncada         |
    And they reload the builder
    Then the concept step shows every detail they entered

  Scenario: A concept detail can be cleared
    Given a build named "Lucita"
    When they clear the Name
    And they reload the builder
    Then the Name is empty

  Scenario: The page title names the step and the build
    Given a build named "Lucita"
    When they open the "Concept" step
    Then the page title is "Character concept – Lucita"
