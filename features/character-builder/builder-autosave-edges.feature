Feature: The builder's autosave keeps telling the player while saving keeps failing

  The top bar's alert says what to do when the browser refuses a save. A "Try saving again" that is
  refused as well has to say so again, or the player cannot tell the button did anything.

  Scenario: A refused retry says the alert again each time
    Given a build named "Lucita" of clan "Lasombra"
    And the browser refuses to store data
    When I change my character's name
    Then the failure alert has been announced 1 time
    When I choose "Try saving again"
    Then the failure alert has been announced 2 times
    And the autosave status reads "Changes not saved"
    When I choose "Try saving again"
    Then the failure alert has been announced 3 times
