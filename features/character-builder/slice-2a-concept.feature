Feature: Character concept details

  Scenario: A concept detail can be cleared
    Given a build named "Lucita"
    When they clear the Name
    And they reload the builder
    Then the Name is empty

  Scenario: The page title names the step and the build
    Given a build named "Lucita"
    When they open the "Concept" step
    Then the page title is "Character concept – Lucita"
